import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { authMiddleware, requireRoles, type AuthedRequest } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import {
  getTrainerProfileId,
  parsePagination,
  sendList,
} from "./helpers.js";
import { writeAudit } from "../services/audit.service.js";
import { paramId } from "./params.js";
import { notifyUser } from "../services/notification.service.js";
import { syncSessionsCompleted } from "../services/attendance-session.service.js";
import { membershipEndAfterRenew, membershipEndFromStartAndSessions } from "../services/membership.service.js";
import { formatDateIST } from "../lib/datetime-format.js";

async function assertClientAccess(req: AuthedRequest, clientId: string) {
  const role = req.user!.role;
  if (role === "ADMIN") return;
  if (role === "CLIENT") {
    const mine = await prisma.profileClient.findFirst({ where: { id: clientId, userId: req.user!.id } });
    if (!mine) throw new AppError(403, "Forbidden");
    return;
  }
  if (role === "TRAINER") {
    const tid = await getTrainerProfileId(req.user!.id);
    const c = await prisma.profileClient.findFirst({ where: { id: clientId, trainerId: tid } });
    if (!c) throw new AppError(403, "Forbidden");
  }
}

export function clientsRouter(env: Env) {
  const r = Router();
  r.use(authMiddleware(env));

  r.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const { skip, take, page, pageSize } = parsePagination(req.query as Record<string, unknown>);
      const search = String(req.query.search ?? "").trim();

      let where: Prisma.ProfileClientWhereInput = {};

      if (req.user!.role === "TRAINER") {
        const tid = await getTrainerProfileId(req.user!.id);
        where = { ...where, trainerId: tid };
      } else if (req.user!.role !== "ADMIN") {
        throw new AppError(403, "Forbidden");
      }

      if (search) {
        where = {
          ...where,
          user: {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        };
      }

      const [rows, total] = await Promise.all([
        prisma.profileClient.findMany({
          where,
          skip,
          take,
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, active: true } },
            trainer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.profileClient.count({ where }),
      ]);

      sendList(res, rows, total, page, pageSize);
    }),
  );

  const adminOnly = requireRoles("ADMIN");
  const createAllowed = requireRoles("ADMIN", "TRAINER");

  const createSchemaBase = {
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    age: z.number().int().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    dob: z.coerce.date().optional(),
    emergencyContact: z.string().optional(),
    emergencyPhone: z.string().optional(),
    goal: z.string().optional(),
    medicalNotes: z.string().optional(),
    membershipStart: z.coerce.date(),
    totalSessions: z.number().int().positive(),
    sessionsCompleted: z.number().int().nonnegative().optional(),

    // Onboarding Form & PAR-Q Fields
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipcode: z.string().optional(),
    secondaryPhone: z.string().optional(),
    secondaryEmail: z.string().email().optional().or(z.literal("")),
    amountPaid: z.coerce.number().optional(),
    rulesAccepted: z.boolean().optional(),
    registrationSignature: z.string().optional(),
    parqHeartCondition: z.boolean().optional(),
    parqChestPainActivity: z.boolean().optional(),
    parqChestPainRest: z.boolean().optional(),
    parqDizziness: z.boolean().optional(),
    parqBoneJoint: z.boolean().optional(),
    parqBloodPressureDrugs: z.boolean().optional(),
    parqOtherReason: z.boolean().optional(),
    parqNotes: z.string().optional(),
    parqSignature: z.string().optional(),
    guardianName: z.string().optional(),
  };

  const createSchemaAdmin = z.object({
    ...createSchemaBase,
    trainerId: z.string().uuid(),
  });

  const createSchemaTrainer = z.object(createSchemaBase);

  r.post(
    "/",
    createAllowed,
    asyncHandler(async (req: AuthedRequest, res) => {
      const isTrainer = req.user!.role === "TRAINER";
      const body = isTrainer ? createSchemaTrainer.parse(req.body) : createSchemaAdmin.parse(req.body);
      const trainerId = isTrainer
        ? await getTrainerProfileId(req.user!.id)
        : (body as z.infer<typeof createSchemaAdmin>).trainerId;

      const trainer = await prisma.profileTrainer.findUnique({ where: { id: trainerId } });
      if (!trainer) throw new AppError(404, "Trainer not found");

      const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
      if (exists) throw new AppError(409, "Email already registered");

      const passwordHash = await hashPassword(body.password, env.BCRYPT_ROUNDS);
      const membershipStart = body.membershipStart;
      const membershipEnd = membershipEndFromStartAndSessions(membershipStart, body.totalSessions);

      const client = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: body.email.toLowerCase(),
            passwordHash,
            role: "CLIENT",
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
          },
        });

        const profile = await tx.profileClient.create({
          data: {
            userId: user.id,
            trainerId,
            age: body.age,
            gender: body.gender,
            dob: body.dob,
            emergencyContact: body.emergencyContact,
            emergencyPhone: body.emergencyPhone,
            goal: body.goal,
            medicalNotes: body.medicalNotes,
            membershipStart,
            membershipEnd,
            totalSessions: body.totalSessions,
            sessionsCompleted: body.sessionsCompleted ?? 0,
            reportToken: randomUUID(),
          },
          include: { user: true, trainer: { include: { user: true } } },
        });

        const isMinor = body.age ? body.age < 18 : false;
        const parqCleared = !(
          body.parqHeartCondition ||
          body.parqChestPainActivity ||
          body.parqChestPainRest ||
          body.parqDizziness ||
          body.parqBoneJoint ||
          body.parqBloodPressureDrugs ||
          body.parqOtherReason
        );

        const onboarding = await tx.clientOnboarding.create({
          data: {
            clientId: profile.id,
            dob: body.dob,
            address: body.address,
            city: body.city || "Surat",
            state: body.state || "Gujarat",
            zipcode: body.zipcode,
            secondaryPhone: body.secondaryPhone,
            secondaryEmail: body.secondaryEmail || undefined,
            amountPaid: body.amountPaid,
            rulesAccepted: body.rulesAccepted ?? true,
            rulesAcceptedAt: new Date(),
            registrationSignature: body.registrationSignature,
            registrationSignedAt: body.registrationSignature ? new Date() : undefined,
            parqHeartCondition: body.parqHeartCondition ?? false,
            parqChestPainActivity: body.parqChestPainActivity ?? false,
            parqChestPainRest: body.parqChestPainRest ?? false,
            parqDizziness: body.parqDizziness ?? false,
            parqBoneJoint: body.parqBoneJoint ?? false,
            parqBloodPressureDrugs: body.parqBloodPressureDrugs ?? false,
            parqOtherReason: body.parqOtherReason ?? false,
            parqCleared,
            parqNotes: body.parqNotes,
            parqSignature: body.parqSignature,
            parqSignedAt: body.parqSignature ? new Date() : undefined,
            isMinor,
            guardianName: body.guardianName,
          },
        });

        return { ...profile, onboarding };
      });

      await writeAudit({
        actorId: req.user!.id,
        entity: "Client",
        entityId: client.id,
        action: "CREATE",
        newValue: client,
      });

      await notifyUser({
        userId: client.userId,
        type: "WORKOUT_UPDATED",
        title: "Welcome aboard",
        body: "Your trainer has added you to the transformation platform.",
      });

      res.status(201).json(client);
    }),
  );

  r.get(
    "/:id",
    asyncHandler(async (req: AuthedRequest, res) => {
      const cid = paramId(req.params, "id");
      await assertClientAccess(req, cid);
      const client = await prisma.profileClient.findUnique({
        where: { id: cid },
        include: {
          user: true,
          trainer: { include: { user: true } },
          onboarding: true,
        },
      });
      if (!client) throw new AppError(404, "Client not found");
      client.sessionsCompleted = await syncSessionsCompleted(client.id);
      res.json(client);
    }),
  );

  const onboardingUpdateSchema = z.object({
    dob: z.coerce.date().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipcode: z.string().optional(),
    secondaryPhone: z.string().optional(),
    secondaryEmail: z.string().email().optional().or(z.literal("")),
    amountPaid: z.coerce.number().optional(),
    rulesAccepted: z.boolean().optional(),
    registrationSignature: z.string().optional(),
    parqHeartCondition: z.boolean().optional(),
    parqChestPainActivity: z.boolean().optional(),
    parqChestPainRest: z.boolean().optional(),
    parqDizziness: z.boolean().optional(),
    parqBoneJoint: z.boolean().optional(),
    parqBloodPressureDrugs: z.boolean().optional(),
    parqOtherReason: z.boolean().optional(),
    parqNotes: z.string().optional(),
    parqSignature: z.string().optional(),
    guardianName: z.string().optional(),
  });

  r.patch(
    "/:id/onboarding",
    requireRoles("ADMIN", "TRAINER"),
    asyncHandler(async (req: AuthedRequest, res) => {
      const clientId = paramId(req.params, "id");
      await assertClientAccess(req, clientId);
      const body = onboardingUpdateSchema.parse(req.body);

      const client = await prisma.profileClient.findUnique({ where: { id: clientId } });
      if (!client) throw new AppError(404, "Client not found");

      const isMinor = client.age ? client.age < 18 : false;
      const parqCleared = !(
        body.parqHeartCondition ||
        body.parqChestPainActivity ||
        body.parqChestPainRest ||
        body.parqDizziness ||
        body.parqBoneJoint ||
        body.parqBloodPressureDrugs ||
        body.parqOtherReason
      );

      const onboarding = await prisma.clientOnboarding.upsert({
        where: { clientId },
        create: {
          clientId,
          dob: body.dob,
          address: body.address,
          city: body.city || "Surat",
          state: body.state || "Gujarat",
          zipcode: body.zipcode,
          secondaryPhone: body.secondaryPhone,
          secondaryEmail: body.secondaryEmail || undefined,
          amountPaid: body.amountPaid,
          rulesAccepted: body.rulesAccepted ?? true,
          rulesAcceptedAt: new Date(),
          registrationSignature: body.registrationSignature,
          registrationSignedAt: body.registrationSignature ? new Date() : undefined,
          parqHeartCondition: body.parqHeartCondition ?? false,
          parqChestPainActivity: body.parqChestPainActivity ?? false,
          parqChestPainRest: body.parqChestPainRest ?? false,
          parqDizziness: body.parqDizziness ?? false,
          parqBoneJoint: body.parqBoneJoint ?? false,
          parqBloodPressureDrugs: body.parqBloodPressureDrugs ?? false,
          parqOtherReason: body.parqOtherReason ?? false,
          parqCleared,
          parqNotes: body.parqNotes,
          parqSignature: body.parqSignature,
          parqSignedAt: body.parqSignature ? new Date() : undefined,
          isMinor,
          guardianName: body.guardianName,
        },
        update: {
          ...(body.dob !== undefined ? { dob: body.dob } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.state !== undefined ? { state: body.state } : {}),
          ...(body.zipcode !== undefined ? { zipcode: body.zipcode } : {}),
          ...(body.secondaryPhone !== undefined ? { secondaryPhone: body.secondaryPhone } : {}),
          ...(body.secondaryEmail !== undefined ? { secondaryEmail: body.secondaryEmail || null } : {}),
          ...(body.amountPaid !== undefined ? { amountPaid: body.amountPaid } : {}),
          ...(body.rulesAccepted !== undefined ? { rulesAccepted: body.rulesAccepted } : {}),
          ...(body.registrationSignature !== undefined
            ? { registrationSignature: body.registrationSignature, registrationSignedAt: new Date() }
            : {}),
          ...(body.parqHeartCondition !== undefined ? { parqHeartCondition: body.parqHeartCondition } : {}),
          ...(body.parqChestPainActivity !== undefined ? { parqChestPainActivity: body.parqChestPainActivity } : {}),
          ...(body.parqChestPainRest !== undefined ? { parqChestPainRest: body.parqChestPainRest } : {}),
          ...(body.parqDizziness !== undefined ? { parqDizziness: body.parqDizziness } : {}),
          ...(body.parqBoneJoint !== undefined ? { parqBoneJoint: body.parqBoneJoint } : {}),
          ...(body.parqBloodPressureDrugs !== undefined ? { parqBloodPressureDrugs: body.parqBloodPressureDrugs } : {}),
          ...(body.parqOtherReason !== undefined ? { parqOtherReason: body.parqOtherReason } : {}),
          parqCleared,
          ...(body.parqNotes !== undefined ? { parqNotes: body.parqNotes } : {}),
          ...(body.parqSignature !== undefined ? { parqSignature: body.parqSignature, parqSignedAt: new Date() } : {}),
          ...(body.guardianName !== undefined ? { guardianName: body.guardianName } : {}),
        },
      });

      res.json(onboarding);
    }),
  );

  const updateAllowed = requireRoles("ADMIN", "TRAINER");

  const basicUpdateSchema = {
    age: z.number().int().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    emergencyContact: z.string().optional(),
    emergencyPhone: z.string().optional(),
    goal: z.string().optional(),
    medicalNotes: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  };

  const adminUpdateSchema = z.object({
    ...basicUpdateSchema,
    trainerId: z.string().uuid().optional(),
    membershipStart: z.coerce.date().optional(),
    membershipEnd: z.coerce.date().optional(),
    totalSessions: z.number().int().nonnegative().optional(),
    sessionsCompleted: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
  });

  const trainerUpdateSchema = z.object(basicUpdateSchema);

  r.patch(
    "/:id",
    updateAllowed,
    asyncHandler(async (req: AuthedRequest, res) => {
      const isAdmin = req.user!.role === "ADMIN";
      const body = isAdmin ? adminUpdateSchema.parse(req.body) : trainerUpdateSchema.parse(req.body);
      const clientId = paramId(req.params, "id");
      const client = await prisma.profileClient.findUnique({
        where: { id: clientId },
        include: { user: true },
      });
      if (!client) throw new AppError(404, "Client not found");
      if (!isAdmin) await assertClientAccess(req, clientId);

      const nextEmail = body.email?.toLowerCase();
      if (nextEmail && nextEmail !== client.user.email) {
        const emailOwner = await prisma.user.findUnique({ where: { email: nextEmail } });
        if (emailOwner && emailOwner.id !== client.userId) throw new AppError(409, "Email already registered");
      }
      const oldSnap = structuredClone(client);

      const updated = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: client.userId },
          data: {
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
            email: nextEmail,
            active: isAdmin ? (body as z.infer<typeof adminUpdateSchema>).active : undefined,
          },
        });
        const adminBody = isAdmin ? (body as z.infer<typeof adminUpdateSchema>) : undefined;
        return tx.profileClient.update({
          where: { id: client.id },
          data: {
            trainerId: adminBody?.trainerId,
            age: body.age,
            gender: body.gender,
            emergencyContact: body.emergencyContact,
            emergencyPhone: body.emergencyPhone,
            goal: body.goal,
            medicalNotes: body.medicalNotes,
            membershipStart: adminBody?.membershipStart,
            membershipEnd: adminBody?.membershipEnd,
            totalSessions: adminBody?.totalSessions,
            sessionsCompleted: adminBody?.sessionsCompleted,
          },
          include: { user: true, trainer: { include: { user: true } } },
        });
      });

      await writeAudit({
        actorId: req.user!.id,
        entity: "Client",
        entityId: clientId,
        action: "UPDATE",
        oldValue: oldSnap,
        newValue: updated,
      });

      const trainerId = isAdmin ? (body as z.infer<typeof adminUpdateSchema>).trainerId : undefined;
      if (trainerId && trainerId !== client.trainerId) {
        await notifyUser({
          userId: updated.userId,
          type: "WORKOUT_UPDATED",
          title: "Trainer updated",
          body: "You were assigned to a new trainer.",
        });
      }

      res.json(updated);
    }),
  );

  r.post(
    "/:id/extend-membership",
    adminOnly,
    asyncHandler(async (req: AuthedRequest, res) => {
      const schema = z.object({
        addSessions: z.number().int().positive(),
      });
      const body = schema.parse(req.body);
      const client = await prisma.profileClient.findUnique({ where: { id: paramId(req.params, "id") } });
      if (!client) throw new AppError(404, "Client not found");

      const membershipEnd = membershipEndAfterRenew(client.membershipEnd, body.addSessions);
      const totalSessions = client.totalSessions + body.addSessions;

      const updated = await prisma.profileClient.update({
        where: { id: client.id },
        data: {
          membershipEnd,
          totalSessions,
        },
        include: { user: true },
      });

      await writeAudit({
        actorId: req.user!.id,
        entity: "Client",
        entityId: client.id,
        action: "EXTEND_MEMBERSHIP",
        oldValue: client,
        newValue: updated,
      });

      await notifyUser({
        userId: client.userId,
        type: "MEMBERSHIP_EXPIRING",
        title: "Membership extended",
        body: `Your package now has ${totalSessions} sessions through ${formatDateIST(membershipEnd)}.`,
      });

      res.json(updated);
    }),
  );

  r.post(
    "/:id/reset-password",
    adminOnly,
    asyncHandler(async (req: AuthedRequest, res) => {
      const schema = z.object({ password: z.string().min(8) });
      const { password } = schema.parse(req.body);
      const client = await prisma.profileClient.findUnique({ where: { id: paramId(req.params, "id") } });
      if (!client) throw new AppError(404, "Client not found");
      const passwordHash = await hashPassword(password, env.BCRYPT_ROUNDS);
      await prisma.user.update({ where: { id: client.userId }, data: { passwordHash } });
      await writeAudit({
        actorId: req.user!.id,
        entity: "Client",
        entityId: client.id,
        action: "RESET_PASSWORD",
      });
      res.json({ message: "Password reset" });
    }),
  );

  r.delete(
    "/:id",
    adminOnly,
    asyncHandler(async (req: AuthedRequest, res) => {
      const client = await prisma.profileClient.findUnique({ where: { id: paramId(req.params, "id") } });
      if (!client) throw new AppError(404, "Client not found");
      await prisma.$transaction([
        prisma.profileClient.delete({ where: { id: client.id } }),
        prisma.user.delete({ where: { id: client.userId } }),
      ]);
      await writeAudit({
        actorId: req.user!.id,
        entity: "Client",
        entityId: client.id,
        action: "DELETE",
      });
      res.status(204).send();
    }),
  );

  return r;
}
