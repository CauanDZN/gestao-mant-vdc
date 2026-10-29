import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { churchSnapshotSchema } from "@/lib/church-validation";
import { CHURCH_ID } from "@/lib/church";
import { ensureChurch } from "@/lib/ensure-church";
import { getCurrentUser } from "@/lib/auth/dal";
import { isRole } from "@/lib/auth/roles";
import type { ChurchDatabase } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_000_000;

type ChurchRecord = Prisma.ChurchGetPayload<{
  include: {
    transactions: true;
    assets: true;
    events: true;
    people: true;
    commitments: true;
  };
}>;

function nextCode(records: Array<{ code: string }>): number {
  return records.reduce((next, record) => {
    const suffix = Number(record.code.match(/(\d+)$/)?.[1]);
    return Number.isInteger(suffix) ? Math.max(next, suffix + 1) : next;
  }, 1);
}

function toChurchDatabase(church: ChurchRecord): ChurchDatabase {
  return {
    version: 1,
    settings: {
      churchName: church.name,
      location: church.location,
      monthlyGoal: church.monthlyGoal,
      openingBalance: church.openingBalance,
    },
    transactions: church.transactions.map(({ id, date, type, category, description, amount, method }) => ({
      id, date, type: type as ChurchDatabase["transactions"][number]["type"],
      category, description, amount, method,
    })),
    assets: church.assets.map(({ id, code, name, category, location, status, value, acquiredAt, responsible }) => ({
      id, code, name, category, location,
      status: status as ChurchDatabase["assets"][number]["status"],
      value, acquiredAt, responsible,
    })),
    events: church.events.map(({ id, title, type, date, time, location, leader, attendanceIds, visitors }) => ({
      id, title, type: type as ChurchDatabase["events"][number]["type"],
      date, time, location, leader, attendanceIds, visitors,
    })),
    people: church.people.map(({ id, name, phone, email, birthday, stage, group, firstVisit, notes, contactDates, cellId }) => ({
      id, name, phone, email, birthday,
      stage: stage as ChurchDatabase["people"][number]["stage"],
      group, firstVisit, notes, contactDates, cellId,
    })),
    commitments: church.commitments.map(({ id, name, category, totalAmount, installments, paidInstallments, nextDueDate }) => ({
      id, name, category, totalAmount, installments, paidInstallments, nextDueDate,
    })),
    counters: {
      transaction: church.transactions.length + 1,
      asset: nextCode(church.assets),
      event: church.events.length + 1,
      person: church.people.length + 1,
    },
  };
}

async function readChurch() {
  await ensureChurch();
  const church = await prisma.church.findUnique({
    where: { id: CHURCH_ID },
    include: {
      transactions: { orderBy: [{ date: "desc" }, { id: "desc" }] },
      assets: { orderBy: [{ code: "asc" }] },
      events: { orderBy: [{ date: "asc" }, { time: "asc" }] },
      people: { orderBy: [{ name: "asc" }] },
      commitments: { orderBy: [{ nextDueDate: "asc" }] },
    },
  });
  if (!church) throw new Error("Church workspace was not initialized.");
  return church;
}

export async function GET() {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role)) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  try {
    const church = await readChurch();
    return NextResponse.json(
      { data: toChurchDatabase(church), version: church.version },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Church data could not be loaded.", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os dados da igreja." },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role)) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (current.role === "membro") {
    return NextResponse.json({ error: "Seu perfil não pode alterar estes dados." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "O envio excede o limite permitido." }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (error) {
    console.error("Church data request body could not be read.", error);
    return NextResponse.json({ error: "Não foi possível ler os dados enviados." }, { status: 400 });
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "O envio excede o limite permitido." }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "O formato dos dados enviados é inválido." }, { status: 400 });
  }

  const parsed = churchSnapshotSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Alguns dados estão incompletos ou inválidos.", issues: parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })) },
      { status: 400 },
    );
  }

  const { data, version } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const update = await tx.church.updateMany({
        where: { id: CHURCH_ID, version },
        data: {
          name: data.settings.churchName,
          location: data.settings.location,
          monthlyGoal: data.settings.monthlyGoal,
          openingBalance: data.settings.openingBalance,
          version: { increment: 1 },
        },
      });
      if (update.count === 0) return false;

      await tx.financialTransaction.deleteMany({ where: { churchId: CHURCH_ID } });
      await tx.churchAsset.deleteMany({ where: { churchId: CHURCH_ID } });
      await tx.churchEvent.deleteMany({ where: { churchId: CHURCH_ID } });
      await tx.churchPerson.deleteMany({ where: { churchId: CHURCH_ID } });
      await tx.churchCommitment.deleteMany({ where: { churchId: CHURCH_ID } });

      if (data.transactions.length) {
        await tx.financialTransaction.createMany({ data: data.transactions.map((item) => ({ ...item, churchId: CHURCH_ID })) });
      }
      if (data.assets.length) {
        await tx.churchAsset.createMany({ data: data.assets.map((item) => ({ ...item, churchId: CHURCH_ID })) });
      }
      if (data.events.length) {
        await tx.churchEvent.createMany({ data: data.events.map((item) => ({ ...item, churchId: CHURCH_ID })) });
      }
      if (data.people.length) {
        await tx.churchPerson.createMany({
          data: data.people.map((item) => ({ ...item, cellId: item.cellId ?? null, churchId: CHURCH_ID })),
        });
      }
      if (data.commitments.length) {
        await tx.churchCommitment.createMany({ data: data.commitments.map((item) => ({ ...item, churchId: CHURCH_ID })) });
      }
      return true;
    });

    if (!result) {
      const current = await prisma.church.findUnique({ where: { id: CHURCH_ID }, select: { version: true } });
      return NextResponse.json(
        { error: "Os dados foram alterados em outra sessão. Recarregue para continuar.", version: current?.version },
        { status: 409 },
      );
    }
    return NextResponse.json({ version: version + 1 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Church data could not be saved.", error);
    return NextResponse.json(
      { error: "Não foi possível salvar. Suas alterações continuam nesta página." },
      { status: 503 },
    );
  }
}
