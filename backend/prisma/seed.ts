import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";
  const forcePassword = process.env.SEED_FORCE_ADMIN_PASSWORD === "true";

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in backend/.env before running the seed. " +
        "Example: SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD='YourStrongPassword!'",
    );
  }
  if (adminPassword.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing && existing.role !== "ADMIN") {
    throw new Error(`User ${adminEmail} already exists with role ${existing.role}. Use another email or remove that user first.`);
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(adminPassword, rounds);
  const firstName = (process.env.SEED_ADMIN_FIRST_NAME ?? "Admin").trim() || "Admin";
  const lastName = (process.env.SEED_ADMIN_LAST_NAME ?? "User").trim() || "User";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: forcePassword ? { passwordHash, firstName, lastName } : {},
    create: {
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      firstName,
      lastName,
      phone: process.env.SEED_ADMIN_PHONE?.trim() || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      entity: "User",
      entityId: admin.id,
      action: "SEED_ADMIN",
      newValue: { email: adminEmail, message: "Bootstrap admin only (no demo trainer/client)." },
    },
  });

  console.log("Seed complete.");
  console.log(`  Admin user: ${adminEmail}`);
  console.log("  Sign in with the password from SEED_ADMIN_PASSWORD (not printed here).");
  if (!forcePassword) {
    console.log("  To reset this admin's password, set SEED_FORCE_ADMIN_PASSWORD=true and run seed again.");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
