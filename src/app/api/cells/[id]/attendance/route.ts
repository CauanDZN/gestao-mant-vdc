import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canEditPeopleAndAgenda, isRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  attendeeIds: z.array(z.string()).max(500),
  visitors: z.number().int().nonnegative().max(500).optional().default(0),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id } = await params;
  const cell = await prisma.cell.findFirst({ where: { id, churchId: CHURCH_ID } });
  if (!cell) return NextResponse.json({ error: "Célula não encontrada." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Informe a data e quem participou." }, { status: 400 });

  const attendance = await prisma.cellAttendance.upsert({
    where: { id: `${id}__${parsed.data.date}` },
    update: { attendeeIds: parsed.data.attendeeIds, visitors: parsed.data.visitors },
    create: {
      id: `${id}__${parsed.data.date}`,
      cellId: id,
      date: parsed.data.date,
      attendeeIds: parsed.data.attendeeIds,
      visitors: parsed.data.visitors,
    },
  });

  return NextResponse.json({ attendance });
}
