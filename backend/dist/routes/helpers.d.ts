import type { AuthedRequest } from "../middleware/authMiddleware.js";
import type { Response } from "express";
export declare function requireUserProfile(req: AuthedRequest): Promise<{
    client: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        trainerId: string;
        age: number | null;
        gender: import("@prisma/client").$Enums.Gender | null;
        emergencyContact: string | null;
        emergencyPhone: string | null;
        goal: string | null;
        medicalNotes: string | null;
        membershipStart: Date | null;
        membershipEnd: Date | null;
        totalSessions: number;
        sessionsCompleted: number;
        reportToken: string | null;
    } | null;
    trainer: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        bio: string | null;
        specialization: string | null;
    } | null;
} & {
    id: string;
    email: string;
    passwordHash: string;
    role: import("@prisma/client").$Enums.Role;
    firstName: string;
    lastName: string;
    phone: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function getTrainerProfileId(userId: string): Promise<string>;
export declare function getClientProfileId(userId: string): Promise<string>;
export declare function parsePagination(query: Record<string, unknown>): {
    skip: number;
    take: number;
    page: number;
    pageSize: number;
};
export declare function sendList<T>(res: Response, rows: T[], total: number, page: number, pageSize: number): Response<any, Record<string, any>>;
//# sourceMappingURL=helpers.d.ts.map