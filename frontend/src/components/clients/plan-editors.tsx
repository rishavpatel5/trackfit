"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cachedApiGet } from "@/lib/api-cache";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

/* ─── Diet ─── */

type MealRow = {
  slotLabel?: string | null;
  foodName: string;
  quantity: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sortOrder: number;
};

type DietDay = {
  label: string;
  sortOrder: number;
  meals: MealRow[];
};

export type DietWeek = {
  id: string;
  weekNumber: number;
  days: { label: string; sortOrder: number; meals: MealRow[]; macros?: { calories: number; protein: number; carbs: number; fat: number } }[];
};

export function DietPlanSection({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const [weeks, setWeeks] = useState<DietWeek[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    cachedApiGet<DietWeek[]>(`/diets/clients/${clientId}/weeks`, 30_000)
      .then(setWeeks)
      .catch(() => toast.error("Unable to load diets"));
  }, [clientId, tick]);

  async function addWeek(weekNumber: number, scaffold: boolean) {
    try {
      if (scaffold) {
        await api.post(`/diets/clients/${clientId}/weeks`, {
          weekNumber,
          days: [
            {
              label: "Monday · edit label / meals",
              meals: [
                { slotLabel: "Meal 1", foodName: "Food item", quantity: "", calories: 0, protein: 0, carbs: 0, fat: 0, sortOrder: 0 },
              ],
            },
          ],
        });
      } else {
        await api.post(`/diets/clients/${clientId}/weeks`, {
          weekNumber,
          days: [
            {
              label: "Monday",
              meals: [
                {
                  slotLabel: "Breakfast",
                  foodName: "Example — replace",
                  quantity: "",
                  calories: 400,
                  protein: 30,
                  carbs: 40,
                  fat: 12,
                  sortOrder: 0,
                },
                {
                  slotLabel: "Lunch",
                  foodName: "Lean protein + rice",
                  quantity: "",
                  calories: 600,
                  protein: 45,
                  carbs: 55,
                  fat: 18,
                  sortOrder: 1,
                },
              ],
            },
          ],
        });
      }
      toast.success(`Nutrition week ${weekNumber} created`);
      refresh();
    } catch {
      toast.error("Duplicate week number or validation error");
    }
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/80 bg-muted/10 p-4 md:flex-row md:flex-wrap md:items-end md:gap-x-4">
          <DietWeekCreateToolbar onSubmit={addWeek} />
        </div>
      ) : null}

      <Accordion type="multiple" className="divide-y divide-border rounded-xl border border-border">
        {weeks.map((week) => (
          <AccordionItem key={week.id} value={week.id}>
            <div className="flex flex-wrap items-center justify-between gap-2 pr-4">
              <AccordionTrigger className="flex-1 py-4 hover:no-underline">Nutrition week {week.weekNumber}</AccordionTrigger>
              {canEdit ? (
                <DietWeekEditorDialog week={week} onSaved={refresh}>
                  <Button size="sm" variant="outline" className="shrink-0 border-border">
                    Edit week
                  </Button>
                </DietWeekEditorDialog>
              ) : null}
            </div>
            <AccordionContent>
              <div className="space-y-4 pb-4">
                {week.days.map((day) => (
                  <div key={day.label}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{day.label}</p>
                      {day.macros ? (
                        <Badge variant="outline">
                          {day.macros.calories.toFixed(0)} kcal · P{day.macros.protein.toFixed(0)} · C{day.macros.carbs.toFixed(0)} · F
                          {day.macros.fat.toFixed(0)}
                        </Badge>
                      ) : null}
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {day.meals.map((meal, mi) => (
                        <li key={`${meal.foodName}-${mi}`}>
                          <span className="text-foreground">{meal.slotLabel || "Meal"}</span>: {meal.foodName}
                          {meal.quantity ? ` (${meal.quantity})` : ""} — {meal.calories} kcal · P{meal.protein} · C{meal.carbs} · F
                          {meal.fat}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {weeks.length === 0 ? <p className="text-center text-sm text-muted-foreground">No nutrition weeks yet.</p> : null}
    </div>
  );
}

function DietWeekCreateToolbar({ onSubmit }: { onSubmit: (n: number, scaffold: boolean) => void }) {
  const [n, setN] = useState(1);
  return (
    <>
      <div>
        <Label>Week number</Label>
        <Input type="number" min={1} className="mt-1 w-28" value={n} onChange={(e) => setN(Number(e.target.value))} />
      </div>
      <Button type="button" onClick={() => onSubmit(n, true)}>
        Add week (minimal day)
      </Button>
      <Button type="button" variant="secondary" className="bg-muted" onClick={() => onSubmit(n, false)}>
        Add week · sample macros (editable)
      </Button>
    </>
  );
}

function DietWeekEditorDialog({ week, onSaved, children }: { week: DietWeek; onSaved: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<DietDay[]>([]);

  useEffect(() => {
    if (!open) return;
    setDays(
      week.days.map((d, di) => ({
        label: d.label,
        sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : di,
        meals: (d.meals ?? []).map((m, mi) => ({
          slotLabel: m.slotLabel ?? "Meal",
          foodName: m.foodName,
          quantity: m.quantity ?? "",
          calories: m.calories ?? 0,
          protein: m.protein ?? 0,
          carbs: m.carbs ?? 0,
          fat: m.fat ?? 0,
          sortOrder: mi,
        })),
      })),
    );
  }, [open, week]);

  async function save() {
    if (days.length === 0) {
      toast.error("Add at least one day.");
      return;
    }
    for (const d of days) {
      if (!d.meals.every((m) => m.foodName.trim())) {
        toast.error("Each meal requires a food name.");
        return;
      }
    }
    try {
      await api.patch(`/diets/weeks/${week.id}`, {
        days: days.map((d, di) => ({
          label: d.label,
          sortOrder: di,
          meals: (d.meals ?? []).map((m, mi) => ({
            slotLabel: m.slotLabel || `Meal ${mi + 1}`,
            foodName: m.foodName.trim(),
            quantity: m.quantity || undefined,
            calories: Number(m.calories),
            protein: Number(m.protein),
            carbs: Number(m.carbs),
            fat: Number(m.fat),
            sortOrder: mi,
          })),
        })),
      });
      toast.success("Diet week saved");
      setOpen(false);
      onSaved();
    } catch {
      toast.error("Save failed.");
    }
  }

  function addDay() {
    setDays([
      ...days,
      {
        label: `Day ${days.length + 1}`,
        sortOrder: days.length,
        meals: [{ slotLabel: "Meal 1", foodName: "", quantity: "", calories: 0, protein: 0, carbs: 0, fat: 0, sortOrder: 0 }],
      },
    ]);
  }

  function removeDay(i: number) {
    setDays(days.filter((_, idx) => idx !== i));
  }

  function addMeal(dayIdx: number) {
    const copy = [...days];
    const ms = [...(copy[dayIdx].meals ?? [])];
    ms.push({ slotLabel: `Meal ${ms.length + 1}`, foodName: "", quantity: "", calories: 0, protein: 0, carbs: 0, fat: 0, sortOrder: ms.length });
    copy[dayIdx] = { ...copy[dayIdx], meals: ms };
    setDays(copy);
  }

  function removeMeal(dayIdx: number, mi: number) {
    const copy = [...days];
    copy[dayIdx] = {
      ...copy[dayIdx],
      meals: (copy[dayIdx].meals ?? []).filter((_, i) => i !== mi),
    };
    setDays(copy);
  }

  function updateDay(dayIdx: number, label: string) {
    const copy = [...days];
    copy[dayIdx] = { ...copy[dayIdx], label };
    setDays(copy);
  }

  function patchMeal(dayIdx: number, mi: number, patch: Partial<MealRow>) {
    const copy = [...days];
    const ms = [...(copy[dayIdx].meals ?? [])];
    ms[mi] = { ...ms[mi], ...patch };
    copy[dayIdx] = { ...copy[dayIdx], meals: ms };
    setDays(copy);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit nutrition week {week.weekNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pb-10">
          {days.map((day, di) => (
            <Card key={`ddf-${di}`} className="border-border bg-card/70">
              <CardContent className="space-y-3 pt-4">
                <div className="flex flex-wrap gap-2">
                  <div className="min-w-[200px] flex-1">
                    <Label>Day label</Label>
                    <Input value={day.label} onChange={(e) => updateDay(di, e.target.value)} placeholder="Wednesday" />
                  </div>
                  <Button variant="destructive" size="sm" className="self-end text-xs h-9" type="button" onClick={() => removeDay(di)}>
                    Remove day
                  </Button>
                </div>
                {(day.meals ?? []).map((meal, mi) => (
                  <Card key={`ml-${di}-${mi}`} className="border-border bg-muted/20 p-3">
                    <div className="grid gap-2 md:grid-cols-12">
                      <div className="md:col-span-3">
                        <Label>Slot</Label>
                        <Input value={meal.slotLabel ?? ""} onChange={(e) => patchMeal(di, mi, { slotLabel: e.target.value })} />
                      </div>
                      <div className="md:col-span-4">
                        <Label>Food</Label>
                        <Input value={meal.foodName} onChange={(e) => patchMeal(di, mi, { foodName: e.target.value })} />
                      </div>
                      <div className="md:col-span-5">
                        <Label>Quantity</Label>
                        <Input value={meal.quantity ?? ""} onChange={(e) => patchMeal(di, mi, { quantity: e.target.value })} />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Calories</Label>
                        <Input
                          type="number"
                          value={meal.calories}
                          min={0}
                          onChange={(e) => patchMeal(di, mi, { calories: Number(e.target.value) })}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Protein</Label>
                        <Input type="number" value={meal.protein} min={0} onChange={(e) => patchMeal(di, mi, { protein: Number(e.target.value) })} />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Carbs</Label>
                        <Input type="number" value={meal.carbs} min={0} onChange={(e) => patchMeal(di, mi, { carbs: Number(e.target.value) })} />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Fat</Label>
                        <Input type="number" value={meal.fat} min={0} onChange={(e) => patchMeal(di, mi, { fat: Number(e.target.value) })} />
                      </div>
                      <div className="md:col-span-12 flex justify-end">
                        <Button variant="outline" size="sm" className="text-destructive" type="button" onClick={() => removeMeal(di, mi)}>
                          Remove meal
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addMeal(di)}>
                  + Add meal
                </Button>
              </CardContent>
            </Card>
          ))}
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button variant="secondary" className="bg-muted" type="button" onClick={addDay}>
              + Add day
            </Button>
            <Button type="button" onClick={save}>
              Save nutrition week
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
