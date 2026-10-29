import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canEditPeopleAndAgenda, isRole } from "@/lib/auth/roles";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  leader: z.string().trim().max(160).default(""),
  auxiliar: z.string().trim().max(160).optional().default(""),
  host: z.string().trim().max(160).optional().default(""),
  weekday: z.string().trim().max(40),
  time: z.string().trim().max(10),
  address: z.string().trim().max(250),
  neighborhood: z.string().trim().max(120).optional().default(""),
  audience: z.string().trim().max(60).optional().default("misto"),
  capacity: z.number().int().nonnegative().max(500).optional().default(0),
  supervisor: z.string().trim().max(160).optional().default(""),
});

export async function GET() {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role)) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const cells = await prisma.cell.findMany({
    where: { churchId: CHURCH_ID },
    include: { members: { select: { id: true, name: true } }, attendances: { orderBy: { date: "desc" }, take: 4 } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ cells });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Preencha o nome, dia, horário e endereço da célula." }, { status: 400 });
  }
  const cell = await prisma.cell.create({ data: { id: uid("cell"), churchId: CHURCH_ID, ...parsed.data } });
  return NextResponse.json({ cell });
}
