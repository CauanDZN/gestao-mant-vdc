import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canEditFinance, isRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditFinance(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const { id } = await params;
  const category = await prisma.budgetCategory.findFirst({ where: { id, churchId: CHURCH_ID } });
  if (!category) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
  await prisma.budgetCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
