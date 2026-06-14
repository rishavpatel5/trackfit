import { Router } from "express";
import { z } from "zod";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { assertClientAccessInline } from "./access.js";
import { writeAudit } from "../services/audit.service.js";
import { notifyUser } from "../services/notification.service.js";
import { paramId } from "./params.js";

const PLAN_WEEK_NUMBER = 1;
const PLAN_DAY_LABEL = "Daily meals";

function sumMacros(meals: { calories: number; protein: number; carbs: number; fat: number }[]) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

async function ensureClientMealPlanWeek(clientId: string, userId: string) {
  let week = await prisma.dietWeek.findUnique({
    where: { clientId_weekNumber: { clientId, weekNumber: PLAN_WEEK_NUMBER } },
  });

  if (!week) {
    week = await prisma.dietWeek.create({
      data: {
        clientId,
        weekNumber: PLAN_WEEK_NUMBER,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  return week;
}

async function loadClientMeals(clientId: string) {
  const week = await prisma.dietWeek.findUnique({
    where: { clientId_weekNumber: { clientId, weekNumber: PLAN_WEEK_NUMBER } },
    include: {
      days: {
        orderBy: { sortOrder: "asc" },
        include: { meals: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!week) {
    return { meals: [], macros: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
  }

  const meals = week.days
    .flatMap((day, dayIdx) =>
      day.meals.map((meal, mealIdx) => ({
        id: meal.id,
        slotLabel: meal.slotLabel,
        foodName: meal.foodName,
        quantity: meal.quantity,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        sortOrder: dayIdx * 1000 + mealIdx,
      })),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((meal, index) => ({
      ...meal,
      slotLabel: meal.slotLabel || `Meal ${index + 1}`,
      sortOrder: index,
    }));

  return { meals, macros: sumMacros(meals) };
}

const mealInputSchema = z.object({
  slotLabel: z.string().optional(),
  foodName: z.string().min(1),
  quantity: z.string().optional(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

const replaceMealsSchema = z.object({
  meals: z.array(mealInputSchema),
});

export function dietsRouter(_env: Env) {
  const r = Router();
  r.use(authMiddleware(_env));

  r.get(
    "/clients/:clientId/meals",
    asyncHandler(async (req: AuthedRequest, res) => {
      await assertClientAccessInline(req, paramId(req.params, "clientId"));
      const plan = await loadClientMeals(paramId(req.params, "clientId"));
      res.json(plan);
    }),
  );

  r.put(
    "/clients/:clientId/meals",
    asyncHandler(async (req: AuthedRequest, res) => {
      if (req.user!.role === "CLIENT") throw new AppError(403, "Forbidden");
      const clientId = paramId(req.params, "clientId");
      await assertClientAccessInline(req, clientId);
      const body = replaceMealsSchema.parse(req.body);

      const week = await ensureClientMealPlanWeek(clientId, req.user!.id);

      const saved = await prisma.$transaction(async (tx) => {
        await tx.mealRow.deleteMany({ where: { day: { weekId: week.id } } });
        await tx.dietDay.deleteMany({ where: { weekId: week.id } });

        const day = await tx.dietDay.create({
          data: {
            weekId: week.id,
            label: PLAN_DAY_LABEL,
            sortOrder: 0,
          },
        });

        if (body.meals.length > 0) {
          await tx.mealRow.createMany({
            data: body.meals.map((meal, index) => ({
              dayId: day.id,
              slotLabel: meal.slotLabel?.trim() || `Meal ${index + 1}`,
              foodName: meal.foodName.trim(),
              quantity: meal.quantity?.trim() || null,
              calories: meal.calories,
              protein: meal.protein,
              carbs: meal.carbs,
              fat: meal.fat,
              sortOrder: index,
            })),
          });
        }

        return tx.dietWeek.update({
          where: { id: week.id },
          data: { updatedById: req.user!.id },
          include: {
            days: {
              orderBy: { sortOrder: "asc" },
              include: { meals: { orderBy: { sortOrder: "asc" } } },
            },
          },
        });
      });

      await writeAudit({
        actorId: req.user!.id,
        entity: "DietWeek",
        entityId: week.id,
        action: "UPDATE_MEALS",
        newValue: saved,
      });

      const client = await prisma.profileClient.findUnique({ where: { id: clientId } });
      if (client) {
        await notifyUser({
          userId: client.userId,
          type: "DIET_UPDATED",
          title: "Diet plan updated",
          body: "Your nutrition plan was updated by your coach.",
        });
      }

      res.json(await loadClientMeals(clientId));
    }),
  );

  return r;
}
