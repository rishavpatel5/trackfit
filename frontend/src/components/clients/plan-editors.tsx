"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cachedApiGet, invalidateApiCache } from "@/lib/api-cache";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

/* ─── Diet ─── */

type MealRow = {
  id?: string;
  slotLabel: string;
  foodName: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sortOrder: number;
};

type DietPlanResponse = {
  meals: MealRow[];
  macros: { calories: number; protein: number; carbs: number; fat: number };
};

function emptyMeal(index: number): MealRow {
  return {
    slotLabel: `Meal ${index + 1}`,
    foodName: "",
    quantity: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sortOrder: index,
  };
}

function normalizeMeals(meals: MealRow[]) {
  return meals.map((meal, index) => ({
    ...meal,
    slotLabel: meal.slotLabel?.trim() || `Meal ${index + 1}`,
    foodName: meal.foodName ?? "",
    quantity: meal.quantity ?? "",
    sortOrder: index,
  }));
}

export function DietPlanSection({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    setLoading(true);
    cachedApiGet<DietPlanResponse>(`/diets/clients/${clientId}/meals`, 30_000)
      .then((res) => setMeals(normalizeMeals(res.meals)))
      .catch(() => toast.error("Unable to load diet plan"))
      .finally(() => setLoading(false));
  }, [clientId, tick]);

  const macros = useMemo(
    () =>
      meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (Number(meal.calories) || 0),
          protein: acc.protein + (Number(meal.protein) || 0),
          carbs: acc.carbs + (Number(meal.carbs) || 0),
          fat: acc.fat + (Number(meal.fat) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [meals],
  );

  function addMeal() {
    setMeals((current) => normalizeMeals([...current, emptyMeal(current.length)]));
  }

  function removeMeal(index: number) {
    setMeals((current) => normalizeMeals(current.filter((_, i) => i !== index)));
  }

  function patchMeal(index: number, patch: Partial<MealRow>) {
    setMeals((current) => {
      const copy = [...current];
      copy[index] = { ...copy[index], ...patch };
      return normalizeMeals(copy);
    });
  }

  async function savePlan() {
    if (meals.some((meal) => !meal.foodName.trim())) {
      toast.error("Each meal requires a food name.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        meals: meals.map((meal, index) => ({
          slotLabel: meal.slotLabel || `Meal ${index + 1}`,
          foodName: meal.foodName.trim(),
          quantity: meal.quantity.trim() || undefined,
          calories: Number(meal.calories) || 0,
          protein: Number(meal.protein) || 0,
          carbs: Number(meal.carbs) || 0,
          fat: Number(meal.fat) || 0,
        })),
      };
      const { data } = await api.put<DietPlanResponse>(`/diets/clients/${clientId}/meals`, payload);
      setMeals(normalizeMeals(data.meals));
      invalidateApiCache(`/diets/clients/${clientId}/meals`);
      toast.success("Diet plan saved");
      refresh();
    } catch {
      toast.error("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading nutrition plan…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {macros.calories.toFixed(0)} kcal · P{macros.protein.toFixed(0)} · C{macros.carbs.toFixed(0)} · F
          {macros.fat.toFixed(0)}
        </Badge>
        <span className="text-xs text-muted-foreground">Daily macro rollup</span>
      </div>

      {meals.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {canEdit ? "No meals yet. Add the first meal below." : "No nutrition plan published yet."}
        </p>
      ) : (
        <div className="space-y-4">
          {meals.map((meal, index) =>
            canEdit ? (
              <MealEditorCard
                key={`meal-edit-${index}`}
                meal={meal}
                onChange={(patch) => patchMeal(index, patch)}
                onRemove={() => removeMeal(index)}
              />
            ) : (
              <MealReadOnlyCard key={`meal-read-${index}`} meal={meal} />
            ),
          )}
        </div>
      )}

      {canEdit ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" className="bg-muted" onClick={addMeal}>
            + Add meal
          </Button>
          <Button type="button" onClick={savePlan} disabled={saving}>
            {saving ? "Saving…" : "Save diet plan"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MealReadOnlyCard({ meal }: { meal: MealRow }) {
  return (
    <Card className="border-border bg-muted/20 p-3">
      <div className="text-sm">
        <p className="font-medium text-foreground">{meal.slotLabel || "Meal"}</p>
        <p className="text-muted-foreground">
          {meal.foodName}
          {meal.quantity ? ` (${meal.quantity})` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {meal.calories} kcal · P{meal.protein} · C{meal.carbs} · F{meal.fat}
        </p>
      </div>
    </Card>
  );
}

function MealEditorCard({
  meal,
  onChange,
  onRemove,
}: {
  meal: MealRow;
  onChange: (patch: Partial<MealRow>) => void;
  onRemove: () => void;
}) {
  return (
    <Card className="border-border bg-muted/20 p-3">
      <CardContent className="p-0">
        <div className="grid gap-2 md:grid-cols-12">
          <div className="md:col-span-3">
            <Label>Slot</Label>
            <Input value={meal.slotLabel} onChange={(e) => onChange({ slotLabel: e.target.value })} />
          </div>
          <div className="md:col-span-4">
            <Label>Food</Label>
            <Input value={meal.foodName} onChange={(e) => onChange({ foodName: e.target.value })} />
          </div>
          <div className="md:col-span-5">
            <Label>Quantity</Label>
            <Input value={meal.quantity} onChange={(e) => onChange({ quantity: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Label>Calories</Label>
            <Input
              type="number"
              value={meal.calories}
              min={0}
              onChange={(e) => onChange({ calories: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-3">
            <Label>Protein</Label>
            <Input type="number" value={meal.protein} min={0} onChange={(e) => onChange({ protein: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-3">
            <Label>Carbs</Label>
            <Input type="number" value={meal.carbs} min={0} onChange={(e) => onChange({ carbs: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-3">
            <Label>Fat</Label>
            <Input type="number" value={meal.fat} min={0} onChange={(e) => onChange({ fat: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-12 flex justify-end">
            <Button variant="outline" size="sm" className="text-destructive" type="button" onClick={onRemove}>
              Remove meal
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
