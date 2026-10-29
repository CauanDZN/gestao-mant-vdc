import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canManageUsers, isRole } from "@/lib/auth/roles";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().default(""),
  role: z.string(),
});

export async function GET() {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canManageUsers(current.role)) {
    return NextResponse.json({ error: "Acesso restrito à bispa." }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    where: { churchId: CHURCH_ID },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      active: true, mustChangePassword: true, createdAt: true, lastLoginAt: true,
    },
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canManageUsers(current.role)) {
    return NextResponse.json({ error: "Acesso restrito à bispa." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success || !isRole(parsed.data.role)) {
    return NextResponse.json({ error: "Preencha nome, e-mail e um perfil válido." }, { status: 400 });
  }

  const { name, email, phone, role } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Já existe um usuário com este e-mail." }, { status: 409 });
  }

  const tempPassword = generateTempPassword();
  const user = await prisma.user.create({
    data: {
      id: uid("user"),
      churchId: CHURCH_ID,
      name,
      email: email.toLowerCase(),
      phone: phone ?? "",
      role,
      passwordHash: hashPassword(tempPassword),
      mustChangePassword: true,
    },
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    tempPassword,
  });
}
