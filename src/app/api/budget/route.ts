import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canAccessFinance, canEditFinance, isRole } from "@/lib/auth/roles";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["receita", "despesa"]),
});

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canAccessFinance(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();

  const [categories, transactions] = await Promise.all([
    prisma.budgetCategory.findMany({
      where: { churchId: CHURCH_ID },
      include: { lines: { where: { year } } },
      orderBy: { name: "asc" },
    }),
    prisma.financialTransaction.findMany({
      where: { churchId: CHURCH_ID, date: { gte: `${year}-01-01`, lt: `${year + 1}-01-01` } },
      select: { date: true, category: true, type: true, amount: true },
    }),
  ]);

  const realized = new Map<string, number[]>();
  for (const transaction of transactions) {
    const month = Number(transaction.date.slice(5, 7));
    const key = `${transaction.category}__${transaction.type === "entrada" ? "receita" : "despesa"}`;
    if (!realized.has(key)) realized.set(key, Array(13).fill(0));
    realized.get(key)![month] += transaction.amount;
  }

  const result = categories.map((category) => {
    const months = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const line = category.lines.find((item) => item.month === month);
      const realizedValues = realized.get(`${category.name}__${category.type}`) ?? Array(13).fill(0);
      return { month, planned: line?.plannedAmount ?? 0, realized: realizedValues[month] ?? 0 };
    });
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      months,
      plannedTotal: months.reduce((sum, item) => sum + item.planned, 0),
      realizedTotal: months.reduce((sum, item) => sum + item.realized, 0),
    };
  });

  return NextResponse.json({ year, categories: result });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditFinance(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe o nome e o tipo (receita ou despesa)." }, { status: 400 });
  }

  try {
    const category = await prisma.budgetCategory.create({
      data: { id: uid("cat"), churchId: CHURCH_ID, name: parsed.data.name, type: parsed.data.type },
    });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Já existe uma categoria com este nome." }, { status: 409 });
  }
}
