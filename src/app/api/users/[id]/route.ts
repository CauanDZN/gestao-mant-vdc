import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canManageUsers, isRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  role: z.string().optional(),
  active: z.boolean().optional(),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canManageUsers(current.role)) {
    return NextResponse.json({ error: "Acesso restrito à bispa." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (parsed.data.role !== undefined && !isRole(parsed.data.role)) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }
  if (id === current.id && parsed.data.active === false) {
    return NextResponse.json({ error: "Você não pode desativar o seu próprio usuário." }, { status: 400 });
  }

  const target = await prisma.user.findFirst({ where: { id, churchId: CHURCH_ID } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
    },
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, mustChangePassword: true },
  });

  return NextResponse.json({ user: updated });
}
