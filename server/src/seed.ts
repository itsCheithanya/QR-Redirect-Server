import bcrypt from "bcryptjs";
import { config } from "./config";
import { prisma } from "./lib/prisma";

async function main() {
  const email = config.adminEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists.`);
  } else {
    await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(config.adminPassword, 12), role: "ADMIN" },
    });
    console.log(`Created admin ${email}`);
  }

  const samples = [
    { path: "promo", destinationUrl: "https://example.com/summer-sale", title: "Summer sale" },
    { path: "docs", destinationUrl: "https://docs.example.com", title: "Documentation" },
  ];
  for (const s of samples) {
    await prisma.redirect.upsert({ where: { path: s.path }, update: {}, create: s });
  }
  console.log("Seed complete.");
}

main().finally(() => prisma.$disconnect());
