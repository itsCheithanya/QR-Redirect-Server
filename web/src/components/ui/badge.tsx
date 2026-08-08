import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "muted" | "destructive" | "accent";

const tones: Record<Tone, string> = {
  default: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  muted: "bg-muted text-muted-foreground",
  destructive: "bg-destructive/15 text-destructive",
  accent: "bg-accent/15 text-accent",
};

export const Badge = ({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) => (
  <span
    className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
    {...props}
  />
);
