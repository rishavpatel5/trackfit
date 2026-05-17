"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export function StatCards({
  items,
}: {
  items: { label: string; value: string | number; hint?: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, i) => (
        <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="border-border/70 bg-gradient-to-br from-card to-card/60 shadow-inner shadow-black/30">
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
              {item.hint ? <p className="mt-2 text-sm text-muted-foreground">{item.hint}</p> : null}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
