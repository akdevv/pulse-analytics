"use client";

import { FlaskConical, X } from "lucide-react";
import { exitDemo } from "@/lib/demo/mode";

export function DemoBanner() {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-primary/25 bg-primary/10 px-4 py-2 text-[13px]">
      <FlaskConical className="size-3.5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 truncate text-foreground/80">
        <span className="font-medium text-foreground">Live demo</span>
        <span className="sm:hidden"> · sample data</span>
        <span className="hidden sm:inline">
          . Sample data generated in your browser; nothing you change is saved.
        </span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => exitDemo("/register")}
          className="cursor-pointer rounded-md bg-primary px-2.5 py-1 text-[12px] font-semibold text-primary-foreground transition-[filter] hover:brightness-110"
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => exitDemo("/")}
          aria-label="Exit demo"
          className="grid size-7 cursor-pointer place-items-center rounded-md text-foreground/60 transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
