import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canEditFinance, isRole } from "@/lib/auth/roles";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  categoryId: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  plannedAmount: z.number().finite().nonnegative(),
});

export async function PUT(request: Request) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditFinance(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados do orçamento inválidos." }, { status: 400 });
  }

  const category = await prisma.budgetCategory.findFirst({
    where: { id: parsed.data.categoryId, churchId: CHURCH_ID },
  });
  if (!category) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });

  const line = await prisma.budgetLine.upsert({
    where: { categoryId_year_month: { categoryId: parsed.data.categoryId, year: parsed.data.year, month: parsed.data.month } },
    update: { plannedAmount: parsed.data.plannedAmount },
    create: {
      id: uid("line"),
      categoryId: parsed.data.categoryId,
      year: parsed.data.year,
      month: parsed.data.month,
      plannedAmount: parsed.data.plannedAmount,
    },
  });

  return NextResponse.json({ line });
}
