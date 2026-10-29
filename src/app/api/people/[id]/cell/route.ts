import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canEditPeopleAndAgenda, isRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ cellId: z.string().min(1).nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Informe a célula." }, { status: 400 });

  const person = await prisma.churchPerson.findFirst({ where: { id, churchId: CHURCH_ID } });
  if (!person) return NextResponse.json({ error: "Pessoa não encontrada." }, { status: 404 });

  if (parsed.data.cellId) {
    const cell = await prisma.cell.findFirst({ where: { id: parsed.data.cellId, churchId: CHURCH_ID } });
    if (!cell) return NextResponse.json({ error: "Célula não encontrada." }, { status: 404 });
  }

  const updated = await prisma.churchPerson.update({ where: { id }, data: { cellId: parsed.data.cellId } });
  return NextResponse.json({ person: updated });
}
