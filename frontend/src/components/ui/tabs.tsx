"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex h-auto w-full min-h-11 flex-wrap content-start items-stretch gap-1.5 rounded-lg bg-muted/60 p-1.5 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium touch-manipulation ring-offset-background transition-all data-[state=active]:z-[1] data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:min-w-[5.5rem]",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 focus-visible:outline-none", className)} {...props} />;
}
