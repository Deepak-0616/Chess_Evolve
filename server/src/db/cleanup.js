import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.chessProfile.findMany();
  console.log("Connected profiles in DB:", profiles.map((p) => p.username));

  for (const p of profiles) {
    const deleted = await prisma.game.deleteMany({
      where: {
        userId: p.userId,
        AND: [
          { NOT: { white: { equals: p.username } } },
          { NOT: { black: { equals: p.username } } },
        ],
      },
    });
    console.log(`Cleaned mismatched games for user ${p.userId} (@${p.username}): ${deleted.count} games deleted.`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
