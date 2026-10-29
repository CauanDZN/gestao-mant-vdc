import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { ensureChurch } from "@/lib/ensure-church";
import { hashPassword } from "@/lib/auth/password";
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/session";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bootstrapSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
});

export async function GET() {
  const existing = await prisma.user.findFirst({ where: { churchId: CHURCH_ID }, select: { id: true } });
  return NextResponse.json({ needsSetup: !existing });
}

export async function POST(request: Request) {
  const existing = await prisma.user.findFirst({ where: { churchId: CHURCH_ID }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "A configuração inicial já foi concluída." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bootstrapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe nome, e-mail e uma senha com pelo menos 8 caracteres." }, { status: 400 });
  }

  await ensureChurch();

  const { name, email, password } = parsed.data;
  const user = await prisma.user.create({
    data: {
      id: uid("user"),
      churchId: CHURCH_ID,
      name,
      email: email.toLowerCase(),
      role: "bispa",
      passwordHash: hashPassword(password),
      mustChangePassword: false,
      lastLoginAt: new Date(),
    },
  });

  const token = signSession({ userId: user.id, churchId: user.churchId, role: "bispa" });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
