import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" | "success" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "border-transparent bg-primary/15 text-primary",
        variant === "outline" && "border-border text-muted-foreground",
        variant === "success" && "border-transparent bg-emerald-500/15 text-emerald-400",
        className,
      )}
      {...props}
    />
  );
}
