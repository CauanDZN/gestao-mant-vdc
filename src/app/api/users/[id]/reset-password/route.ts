import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canManageUsers, isRole } from "@/lib/auth/roles";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canManageUsers(current.role)) {
    return NextResponse.json({ error: "Acesso restrito à bispa." }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findFirst({ where: { id, churchId: CHURCH_ID } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id },
    data: { passwordHash: hashPassword(tempPassword), mustChangePassword: true },
  });

  return NextResponse.json({ tempPassword });
}
