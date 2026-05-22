"use client";

import { Card, CardContent } from "@/components/ui/card";

export function StatCards({
  items,
}: {
  items: { label: string; value: string | number; hint?: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, i) => (
        <div
          key={item.label}
          className="animate-fade-up opacity-0"
          style={{ animationDelay: `${i * 50}ms`, animationFillMode: "forwards" }}
        >
          <Card className="border-border/70 bg-gradient-to-br from-card to-card/60 shadow-inner shadow-black/30">
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
              {item.hint ? <p className="mt-2 text-sm text-muted-foreground">{item.hint}</p> : null}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
