import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/dal";
import { canEditPeopleAndAgenda, isRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({ paymentStatus: z.enum(["isento", "pendente", "pago"]) }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; registrationId: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id, registrationId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const existing = await prisma.eventRegistration.findFirst({ where: { id: registrationId, eventId: id } });
  if (!existing) return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });

  const registration = await prisma.eventRegistration.update({
    where: { id: registrationId },
    data: parsed.data,
    include: { person: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ registration });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; registrationId: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id, registrationId } = await params;
  const existing = await prisma.eventRegistration.findFirst({ where: { id: registrationId, eventId: id } });
  if (!existing) return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
  await prisma.eventRegistration.delete({ where: { id: registrationId } });
  return NextResponse.json({ ok: true });
}
