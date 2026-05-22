import { Router } from "express";
import { authMiddleware, requireRoles } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { getClientProfileId, requireUserProfile } from "./helpers.js";
import { syncClientSessionsCompletedFromLedger } from "../services/attendance-sync.service.js";
export function dashboardRouter(env) {
    const r = Router();
    r.use(authMiddleware(env));
    r.get("/admin", requireRoles("ADMIN"), asyncHandler(async (_req, res) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAhead = new Date(today);
        weekAhead.setDate(weekAhead.getDate() + 7);
        const [trainerCount, clientCount, activeClients, todayAttendance, expiringMemberships, sessionsCompletedAgg,] = await Promise.all([
            prisma.profileTrainer.count(),
            prisma.profileClient.count(),
            prisma.profileClient.count({
                where: { membershipEnd: { gte: today }, user: { active: true } },
            }),
            prisma.attendanceRecord.count({
                where: { sessionDate: today },
            }),
            prisma.profileClient.count({
                where: { membershipEnd: { lte: weekAhead, gte: today } },
            }),
            prisma.profileClient.aggregate({ _sum: { sessionsCompleted: true } }),
        ]);
        res.json({
            totalTrainers: trainerCount,
            totalClients: clientCount,
            activeClients,
            todayAttendance,
            expiringMemberships,
            totalSessionsCompleted: sessionsCompletedAgg._sum.sessionsCompleted ?? 0,
        });
    }));
    r.get("/trainer", requireRoles("TRAINER"), asyncHandler(async (req, res) => {
        const user = await requireUserProfile(req);
        const trainerId = user.trainer?.id;
        if (!trainerId)
            return res.status(403).json({ error: "Not a trainer" });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAhead = new Date(today);
        weekAhead.setDate(weekAhead.getDate() + 14);
        const [assigned, todaySessions, pendingClient, upcomingExpiry] = await Promise.all([
            prisma.profileClient.count({ where: { trainerId } }),
            prisma.attendanceRecord.count({
                where: { trainerId, sessionDate: today },
            }),
            prisma.attendanceRecord.count({
                where: {
                    trainerId,
                    clientStatus: "PENDING",
                    expiresAt: { gte: new Date() },
                },
            }),
            prisma.profileClient.count({
                where: {
                    trainerId,
                    membershipEnd: { lte: weekAhead, gte: today },
                },
            }),
        ]);
        const recentMeasurements = await prisma.measurement.findMany({
            where: { client: { trainerId } },
            orderBy: { recordedAt: "desc" },
            take: 5,
            include: { client: { include: { user: true } } },
        });
        res.json({
            assignedClients: assigned,
            todaySessions,
            pendingAttendance: pendingClient,
            upcomingMembershipExpiry: upcomingExpiry,
            recentMeasurements,
        });
    }));
    r.get("/client", requireRoles("CLIENT"), asyncHandler(async (req, res) => {
        await getClientProfileId(req.user.id);
        const client = await prisma.profileClient.findUnique({
            where: { userId: req.user.id },
            include: { user: true, trainer: { include: { user: true } } },
        });
        if (!client)
            return res.status(404).json({ error: "Client not found" });
        await syncClientSessionsCompletedFromLedger(client.id);
        const clientSynced = await prisma.profileClient.findUniqueOrThrow({
            where: { userId: req.user.id },
            include: { user: true, trainer: { include: { user: true } } },
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await prisma.attendanceRecord.findMany({
            where: { clientId: clientSynced.id },
            orderBy: { sessionDate: "desc" },
            take: 5,
        });
        const pendingPin = await prisma.attendanceRecord.findFirst({
            where: {
                clientId: clientSynced.id,
                clientStatus: "PENDING",
                expiresAt: { gt: new Date() },
            },
            orderBy: { startedAt: "desc" },
            select: { id: true, verifyToken: true, expiresAt: true, sessionDate: true },
        });
        const daysLeft = clientSynced.membershipEnd
            ? Math.ceil((clientSynced.membershipEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
        res.json({
            client: clientSynced,
            recentAttendance: attendance,
            pendingVerification: pendingPin,
            membershipDaysRemaining: daysLeft,
        });
    }));
    return r;
}
//# sourceMappingURL=dashboard.routes.js.map