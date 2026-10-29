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
  name: z.string().trim().min(1).max(160),
  teacher: z.string().trim().max(160).optional().default(""),
  audience: z.string().trim().max(120).optional().default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().trim().max(200).optional().default(""),
  vacancies: z.number().int().nonnegative().max(10000).optional().default(0),
  price: z.number().finite().nonnegative().optional().default(0),
  minAttendancePercent: z.number().int().min(0).max(100).optional().default(75),
});

export async function GET() {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role)) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const courses = await prisma.course.findMany({
    where: { churchId: CHURCH_ID },
    include: { enrollments: { include: { person: { select: { id: true, name: true } } } } },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ courses });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Preencha nome, datas de início e fim do curso." }, { status: 400 });
  }
  const course = await prisma.course.create({ data: { id: uid("course"), churchId: CHURCH_ID, ...parsed.data } });
  return NextResponse.json({ course });
}
