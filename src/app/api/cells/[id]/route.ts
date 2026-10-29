import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canEditPeopleAndAgenda, isRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  leader: z.string().trim().max(160).optional(),
  auxiliar: z.string().trim().max(160).optional(),
  host: z.string().trim().max(160).optional(),
  weekday: z.string().trim().max(40).optional(),
  time: z.string().trim().max(10).optional(),
  address: z.string().trim().max(250).optional(),
  neighborhood: z.string().trim().max(120).optional(),
  audience: z.string().trim().max(60).optional(),
  capacity: z.number().int().nonnegative().max(500).optional(),
  supervisor: z.string().trim().max(160).optional(),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const existing = await prisma.cell.findFirst({ where: { id, churchId: CHURCH_ID } });
  if (!existing) return NextResponse.json({ error: "Célula não encontrada." }, { status: 404 });

  const cell = await prisma.cell.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ cell });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.cell.findFirst({ where: { id, churchId: CHURCH_ID } });
  if (!existing) return NextResponse.json({ error: "Célula não encontrada." }, { status: 404 });
  await prisma.cell.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
