import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canEditPeopleAndAgenda, isRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  teacher: z.string().trim().max(160).optional(),
  audience: z.string().trim().max(120).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  location: z.string().trim().max(200).optional(),
  vacancies: z.number().int().nonnegative().max(10000).optional(),
  price: z.number().finite().nonnegative().optional(),
  minAttendancePercent: z.number().int().min(0).max(100).optional(),
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

  const existing = await prisma.course.findFirst({ where: { id, churchId: CHURCH_ID } });
  if (!existing) return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });

  const course = await prisma.course.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ course });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.course.findFirst({ where: { id, churchId: CHURCH_ID } });
  if (!existing) return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });
  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
