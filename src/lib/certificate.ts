import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type CertificateInput = {
  personName: string;
  courseName: string;
  teacher: string;
  churchName: string;
  issueDate: string;
};

export async function generateCertificatePdf(input: CertificateInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape in points
  const { width, height } = page.getSize();

  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const green = rgb(0.224, 0.514, 0.4);
  const ink = rgb(0.149, 0.227, 0.192);
  const muted = rgb(0.51, 0.565, 0.541);

  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: green, borderWidth: 2 });

  page.drawText(input.churchName.toUpperCase(), {
    x: 60,
    y: height - 90,
    size: 14,
    font: titleFont,
    color: muted,
  });

  const title = "Certificado de Conclusão";
  const titleSize = 30;
  const titleWidth = titleFont.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 180,
    size: titleSize,
    font: titleFont,
    color: green,
  });

  const bodyLines = [
    `Certificamos que ${input.personName}`,
    `concluiu o curso "${input.courseName}",`,
    `ministrado por ${input.teacher}.`,
  ];
  let currentY = height - 260;
  for (const line of bodyLines) {
    const lineWidth = bodyFont.widthOfTextAtSize(line, 18);
    page.drawText(line, { x: (width - lineWidth) / 2, y: currentY, size: 18, font: bodyFont, color: ink });
    currentY -= 32;
  }

  const dateLine = `Emitido em ${input.issueDate}`;
  const dateWidth = bodyFont.widthOfTextAtSize(dateLine, 12);
  page.drawText(dateLine, { x: (width - dateWidth) / 2, y: 90, size: 12, font: bodyFont, color: muted });

  return doc.save();
}
