"use client";

import { Button } from "@/components/ui/button";
import { Code2, ArrowLeft } from "lucide-react";

interface TrackingSnippetProps {
  onStepChange?: (step: number) => void;
}

export function TrackingSnippet({ onStepChange }: TrackingSnippetProps) {
  return (
    <div className="relative border border-border/50 rounded-2xl p-6 sm:p-10 bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.02] to-transparent rounded-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-orange-500/10 ring-1 ring-orange-500/20">
            <Code2 className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Tracking Snippet
          </h2>
        </div>

        <div className="mb-8 p-6 sm:p-8 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-base text-muted-foreground text-center">
            TODO: Will be implemented later
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => onStepChange?.(3)}
            className="h-12 bg-orange-600 hover:bg-orange-700 text-white px-8 font-medium shadow-lg shadow-orange-600/20 hover:shadow-xl hover:shadow-orange-600/30 transition-all duration-200 w-full sm:w-auto"
          >
            Continue
          </Button>
          <Button
            variant="outline"
            onClick={() => onStepChange?.(1)}
            className="h-12 px-6 font-medium hover:bg-muted/50 transition-all w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
