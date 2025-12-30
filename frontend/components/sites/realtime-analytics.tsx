"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BarChart3, ArrowRight } from "lucide-react";

export function RealtimeAnalytics() {
  const router = useRouter();

  return (
    <div className="relative border border-border/50 rounded-2xl p-6 sm:p-10 bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.02] to-transparent rounded-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-green-500/10 ring-1 ring-green-500/20">
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Realtime Analytics
          </h2>
        </div>

        <div className="mb-8 p-6 sm:p-8 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-base text-muted-foreground text-center">
            TODO: Will be implemented later
          </p>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/20 mb-6">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-700">
            Your site has been successfully added!
          </span>
        </div>

        <Button
          onClick={() => router.push("/dashboard/sites")}
          className="h-12 bg-orange-600 hover:bg-orange-700 text-white px-8 font-medium shadow-lg shadow-orange-600/20 hover:shadow-xl hover:shadow-orange-600/30 transition-all duration-200 w-full sm:w-auto"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
