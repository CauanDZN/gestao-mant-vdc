import { Prisma } from "@/generated/prisma/client";
import { createSeedDatabase } from "@/lib/seed";
import { prisma } from "@/lib/prisma";
import { CHURCH_ID } from "@/lib/church";

export async function ensureChurch(): Promise<void> {
  const existing = await prisma.church.findUnique({ where: { id: CHURCH_ID }, select: { id: true } });
  if (existing) return;

  const seed = createSeedDatabase();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.church.create({
        data: {
          id: CHURCH_ID,
          name: seed.settings.churchName,
          location: seed.settings.location,
          monthlyGoal: seed.settings.monthlyGoal,
          openingBalance: seed.settings.openingBalance,
          transactions: {
            createMany: {
              data: seed.transactions.map((item) => ({ ...item })),
            },
          },
          assets: {
            createMany: {
              data: seed.assets.map((item) => ({ ...item })),
            },
          },
          events: {
            createMany: {
              data: seed.events.map((item) => ({ ...item })),
            },
          },
          people: {
            createMany: {
              data: seed.people.map((item) => ({ ...item })),
            },
          },
          commitments: {
            createMany: {
              data: seed.commitments.map((item) => ({ ...item })),
            },
          },
        },
      });
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
  }
}
