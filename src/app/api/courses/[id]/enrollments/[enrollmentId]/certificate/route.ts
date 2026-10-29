import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/dal";
import { isRole } from "@/lib/auth/roles";
import { generateCertificatePdf } from "@/lib/certificate";
import { formatDate } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; enrollmentId: string }> }) {
  const current = await getCurrentUser();
  if (!current || !isRole(current.role)) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id, enrollmentId } = await params;
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { id: enrollmentId, courseId: id },
    include: { course: true, person: true },
  });
  if (!enrollment) return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });

  if (enrollment.attendancePercent < enrollment.course.minAttendancePercent) {
    return NextResponse.json(
      { error: `Frequência mínima de ${enrollment.course.minAttendancePercent}% ainda não atingida.` },
      { status: 400 },
    );
  }

  const pdfBytes = await generateCertificatePdf({
    personName: enrollment.person.name,
    courseName: enrollment.course.name,
    teacher: enrollment.course.teacher || "Equipe da igreja",
    churchName: "MANT VDC",
    issueDate: formatDate(new Date()),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${enrollment.person.name.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
