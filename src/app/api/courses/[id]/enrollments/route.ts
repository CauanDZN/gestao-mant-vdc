import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";
import { getCurrentUser } from "@/lib/auth/dal";
import { canEditPeopleAndAgenda, isRole } from "@/lib/auth/roles";
import { createPixCharge } from "@/lib/payments/pix";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const enrollSchema = z.object({ personId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role) || !canEditPeopleAndAgenda(current.role)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const { id } = await params;
  const course = await prisma.course.findFirst({ where: { id, churchId: CHURCH_ID } });
  if (!course) return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Informe a pessoa a inscrever." }, { status: 400 });

  const person = await prisma.churchPerson.findFirst({ where: { id: parsed.data.personId, churchId: CHURCH_ID } });
  if (!person) return NextResponse.json({ error: "Pessoa não encontrada." }, { status: 404 });

  const confirmedCount = await prisma.courseEnrollment.count({ where: { courseId: id, status: "confirmado" } });
  const status = course.vacancies > 0 && confirmedCount >= course.vacancies ? "espera" : "confirmado";

  const enrollmentId = uid("enroll");
  let paymentStatus: "isento" | "pendente" = course.price > 0 ? "pendente" : "isento";
  let pixChargeId: string | null = null;
  let pixCopyPaste: string | null = null;
  let pixQrCodeBase64: string | null = null;
  let pixNotice: string | undefined;

  if (course.price > 0) {
    try {
      const charge = await createPixCharge({
        amount: course.price,
        description: `Inscrição: ${course.name}`,
        payerName: person.name,
        payerEmail: person.email || undefined,
        externalReference: enrollmentId,
      });
      if ("notConfigured" in charge) {
        pixNotice = `PIX ainda não configurado (${charge.provider}). A inscrição ficou pendente; confirme o pagamento manualmente quando ele chegar.`;
      } else {
        pixChargeId = charge.externalId;
        pixCopyPaste = charge.copyPaste;
        pixQrCodeBase64 = charge.qrCodeBase64;
      }
    } catch (error) {
      pixNotice = error instanceof Error ? error.message : "Não foi possível gerar a cobrança PIX agora.";
    }
  }

  try {
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        id: enrollmentId,
        courseId: id,
        personId: person.id,
        status,
        paymentStatus,
        pixChargeId,
        pixCopyPaste,
        pixQrCodeBase64,
      },
      include: { person: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ enrollment, notice: pixNotice });
  } catch {
    return NextResponse.json({ error: "Esta pessoa já está inscrita neste curso." }, { status: 409 });
  }
}
