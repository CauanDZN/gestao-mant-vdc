import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/dal";
import { canEditPeopleAndAgenda, isRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  attendancePercent: z.number().int().min(0).max(100).optional(),
  status: z.enum(["confirmado", "espera"]).optional(),
  paymentStatus: z.enum(["isento", "pendente", "pago"]).optional(),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; enrollmentId: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id, enrollmentId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const existing = await prisma.courseEnrollment.findFirst({ where: { id: enrollmentId, courseId: id } });
  if (!existing) return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });

  const enrollment = await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: parsed.data,
    include: { person: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ enrollment });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; enrollmentId: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id, enrollmentId } = await params;
  const existing = await prisma.courseEnrollment.findFirst({ where: { id: enrollmentId, courseId: id } });
  if (!existing) return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
  await prisma.courseEnrollment.delete({ where: { id: enrollmentId } });
  return NextResponse.json({ ok: true });
}
