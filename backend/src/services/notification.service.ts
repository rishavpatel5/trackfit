import type { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      metadata: input.metadata ? (input.metadata as object) : undefined,
    },
  });
}
