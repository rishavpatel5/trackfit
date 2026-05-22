import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@gvtrainer.demo").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Demo123!";
  const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? "Admin";
  const lastName = process.env.SEED_ADMIN_LAST_NAME ?? "User";

  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(password, rounds);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, firstName, lastName, role: "ADMIN", active: true },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
      firstName,
      lastName,
      active: true,
    },
  });

  console.log("Admin ready:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
