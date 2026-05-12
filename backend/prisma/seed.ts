import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash("Demo123!", rounds);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gvtrainer.demo" },
    update: {},
    create: {
      email: "admin@gvtrainer.demo",
      passwordHash,
      role: "ADMIN",
      firstName: "Alex",
      lastName: "Admin",
      phone: "+10000000001",
    },
  });

  const trainerUser = await prisma.user.upsert({
    where: { email: "trainer@gvtrainer.demo" },
    update: {},
    create: {
      email: "trainer@gvtrainer.demo",
      passwordHash,
      role: "TRAINER",
      firstName: "Taylor",
      lastName: "Trainer",
      phone: "+10000000002",
    },
  });

  const trainer = await prisma.profileTrainer.upsert({
    where: { userId: trainerUser.id },
    update: {},
    create: {
      userId: trainerUser.id,
      specialization: "Strength & conditioning",
      bio: "National academy certified coach focused on elite transformations.",
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: "client@gvtrainer.demo" },
    update: {},
    create: {
      email: "client@gvtrainer.demo",
      passwordHash,
      role: "CLIENT",
      firstName: "Casey",
      lastName: "Client",
      phone: "+10000000003",
    },
  });

  const membershipEnd = new Date();
  membershipEnd.setMonth(membershipEnd.getMonth() + 2);

  const client = await prisma.profileClient.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: {
      userId: clientUser.id,
      trainerId: trainer.id,
      age: 32,
      gender: "OTHER",
      emergencyContact: "Jamie Client",
      emergencyPhone: "+10000000004",
      goal: "Drop 8kg while maintaining strength",
      medicalNotes: "No injuries reported — clearance on file.",
      membershipStart: new Date(),
      membershipEnd,
      totalSessions: 36,
      sessionsCompleted: 6,
    },
  });

  await prisma.measurement.createMany({
    data: [
      {
        clientId: client.id,
        weight: 92,
        height: 178,
        waist: 94,
        chest: 104,
        hips: 102,
        biceps: 36,
        forearms: 29,
        thigh: 62,
        calves: 39,
        bodyFat: 22,
        bmi: 29.0,
        recordedById: trainerUser.id,
      },
      {
        clientId: client.id,
        weight: 89.5,
        waist: 91,
        bodyFat: 20,
        bmi: 28.2,
        recordedById: trainerUser.id,
      },
    ],
  });

  const workoutWeek = await prisma.workoutWeek.upsert({
    where: {
      clientId_weekNumber: { clientId: client.id, weekNumber: 1 },
    },
    update: {},
    create: {
      clientId: client.id,
      weekNumber: 1,
      createdById: trainerUser.id,
      updatedById: trainerUser.id,
      days: {
        create: [
          {
            label: "Monday — Strength",
            sortOrder: 0,
            exercises: {
              create: [
                {
                  name: "Bench Press",
                  sets: 4,
                  reps: "8-10",
                  weight: "60kg",
                  restSec: 120,
                  tempo: "3-1-1",
                  notes: "Controlled eccentric",
                  sortOrder: 0,
                },
                {
                  name: "Lat Pulldown",
                  sets: 3,
                  reps: "12",
                  weight: "55kg",
                  restSec: 90,
                  tempo: "2-0-2",
                  sortOrder: 1,
                },
              ],
            },
          },
          {
            label: "Wednesday — Lower",
            sortOrder: 1,
            exercises: {
              create: [
                {
                  name: "Back Squat",
                  sets: 5,
                  reps: "5",
                  weight: "90kg",
                  restSec: 180,
                  tempo: "3-1-X",
                  sortOrder: 0,
                },
                {
                  name: "Romanian Deadlift",
                  sets: 3,
                  reps: "10",
                  weight: "70kg",
                  restSec: 120,
                  tempo: "3-2-1",
                  sortOrder: 1,
                },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.dietWeek.upsert({
    where: {
      clientId_weekNumber: { clientId: client.id, weekNumber: 1 },
    },
    update: {},
    create: {
      clientId: client.id,
      weekNumber: 1,
      createdById: trainerUser.id,
      updatedById: trainerUser.id,
      days: {
        create: [
          {
            label: "Monday",
            sortOrder: 0,
            meals: {
              create: [
                {
                  slotLabel: "Breakfast",
                  foodName: "Egg whites & oats",
                  quantity: "200g whites / 80g oats",
                  calories: 520,
                  protein: 42,
                  carbs: 58,
                  fat: 12,
                  sortOrder: 0,
                },
                {
                  slotLabel: "Lunch",
                  foodName: "Chicken salad bowl",
                  quantity: "180g chicken",
                  calories: 640,
                  protein: 55,
                  carbs: 38,
                  fat: 22,
                  sortOrder: 1,
                },
                {
                  slotLabel: "Dinner",
                  foodName: "Salmon & quinoa",
                  quantity: "160g salmon",
                  calories: 700,
                  protein: 48,
                  carbs: 52,
                  fat: 28,
                  sortOrder: 2,
                },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.progressEntry.create({
    data: {
      clientId: client.id,
      weekNumber: 1,
      weekStartDate: new Date(),
      trainerComments: "Solid technique improvements on squat depth.",
      recovery: "Good — sleeping 7h average",
      energyLevel: "High",
      performanceNotes: "Hit all prescribed loads.",
      strengthNotes: "+5kg squat vs baseline",
      createdById: trainerUser.id,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: clientUser.id,
        type: "MEMBERSHIP_EXPIRING",
        title: "Membership checkpoint",
        body: `Renewal window opens ${membershipEnd.toISOString().slice(0, 10)}.`,
      },
      {
        userId: trainerUser.id,
        type: "ATTENDANCE_REMINDER",
        title: "Attendance pulse",
        body: "Review pending verifications before tonight's sessions.",
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      entity: "Seed",
      entityId: workoutWeek.id,
      action: "SEED_DATABASE",
      newValue: { message: "Demo dataset provisioned" },
    },
  });

  console.log("Seed complete:");
  console.log("  Admin     admin@gvtrainer.demo / Demo123!");
  console.log("  Trainer   trainer@gvtrainer.demo / Demo123!");
  console.log("  Client    client@gvtrainer.demo / Demo123!");
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
