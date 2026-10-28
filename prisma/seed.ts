import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createSeedDatabase } from "../src/lib/seed";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the church database.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString, max: 1 }),
});
const churchId = "vdc-main";

async function main() {
  const existing = await prisma.church.findUnique({ where: { id: churchId }, select: { id: true } });
  if (existing) {
    console.log("The church database already contains its workspace; no demo data was changed.");
    return;
  }

  const seed = createSeedDatabase();
  await prisma.$transaction(async (tx) => {
    await tx.church.create({
      data: {
        id: churchId,
        name: seed.settings.churchName,
        location: seed.settings.location,
        monthlyGoal: seed.settings.monthlyGoal,
        openingBalance: seed.settings.openingBalance,
      },
    });
    await tx.financialTransaction.createMany({ data: seed.transactions.map((item) => ({ ...item, churchId })) });
    await tx.churchAsset.createMany({ data: seed.assets.map((item) => ({ ...item, churchId })) });
    await tx.churchEvent.createMany({ data: seed.events.map((item) => ({ ...item, churchId })) });
    await tx.churchPerson.createMany({ data: seed.people.map((item) => ({ ...item, churchId })) });
    await tx.churchCommitment.createMany({ data: seed.commitments.map((item) => ({ ...item, churchId })) });
  });
  console.log("Church demo data was seeded.");
}

main()
  .catch((error: unknown) => {
    console.error("Church database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
