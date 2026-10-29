import { prisma } from "@/lib/prisma";
import { uid } from "@/lib/utils";

function todayISO(): string {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

export async function confirmPixPayment(externalId: string): Promise<boolean> {
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { pixChargeId: externalId },
    include: { course: true, person: true },
  });
  if (enrollment) {
    if (enrollment.paymentStatus !== "pago") {
      await prisma.$transaction([
        prisma.courseEnrollment.update({ where: { id: enrollment.id }, data: { paymentStatus: "pago" } }),
        prisma.financialTransaction.create({
          data: {
            id: uid("mov"),
            churchId: enrollment.course.churchId,
            date: todayISO(),
            type: "entrada",
            category: "Cursos",
            description: `Inscrição em ${enrollment.course.name} — ${enrollment.person.name}`,
            amount: enrollment.course.price,
            method: "PIX",
          },
        }),
      ]);
    }
    return true;
  }

  const registration = await prisma.eventRegistration.findFirst({
    where: { pixChargeId: externalId },
    include: { event: true, person: true },
  });
  if (registration) {
    if (registration.paymentStatus !== "pago") {
      await prisma.$transaction([
        prisma.eventRegistration.update({ where: { id: registration.id }, data: { paymentStatus: "pago" } }),
        prisma.financialTransaction.create({
          data: {
            id: uid("mov"),
            churchId: registration.event.churchId,
            date: todayISO(),
            type: "entrada",
            category: "Eventos",
            description: `Inscrição em ${registration.event.title} — ${registration.person.name}`,
            amount: registration.amount,
            method: "PIX",
          },
        }),
      ]);
    }
    return true;
  }

  return false;
}
