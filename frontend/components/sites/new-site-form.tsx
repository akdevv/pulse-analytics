"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Globe, CheckCircle2 } from "lucide-react";

type NewSiteFormData = {
  siteUrl: string;
  siteName: string;
};

interface NewSiteFormProps {
  onStepChange?: (step: number) => void;
}

export function NewSiteForm({ onStepChange }: NewSiteFormProps) {
  const [detectedDomain, setDetectedDomain] = useState("");

  const form = useForm<NewSiteFormData>({
    defaultValues: {
      siteUrl: "",
      siteName: "",
    },
  });

  const siteUrl = form.watch("siteUrl");

  useEffect(() => {
    if (siteUrl) {
      try {
        const url = new URL(siteUrl);
        setDetectedDomain(url.hostname);
      } catch {
        setDetectedDomain("");
      }
    } else {
      setDetectedDomain("");
    }
  }, [siteUrl]);

  const onSubmit = (data: NewSiteFormData) => {
    // Functionality will be added later
    console.log(data);
    if (onStepChange) {
      onStepChange(2);
    }
  };

  return (
    <div className="relative border border-border/50 rounded-xl sm:rounded-2xl p-5 sm:p-8 bg-card shadow-sm">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-orange-500/2 to-transparent rounded-xl sm:rounded-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-6 sm:mb-8">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h2 className="text-lg sm:text-2xl font-semibold tracking-tight">
            Site Details
          </h2>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 sm:space-y-6"
          >
            <FormField
              control={form.control}
              name="siteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Site URL <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="https://example.com"
                        className="h-11 bg-background border-border focus:border-orange-500/50 focus:ring-orange-500/20 transition-all text-sm"
                        {...field}
                      />
                      {detectedDomain && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Root domain only. Subpages are tracked automatically.
                  </FormDescription>
                  {detectedDomain && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/10">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        Detected domain{" "}
                        <span className="text-foreground font-semibold break-all">
                          {detectedDomain}
                        </span>
                      </span>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="siteName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Site Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Awesome Website"
                      className="h-11 bg-background border-border focus:border-primary/50 focus:ring-primary/20 transition-all text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    A name for your reference in the dashboard.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-2 sm:pt-4 space-y-3 sm:space-y-4">
              <div className="flex justify-end gap-2.5 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 cursor-pointer"
                  onClick={() => form.reset()}
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-11 cursor-pointer">
                  Add Site
                </Button>
              </div>

              <p className="text-xs text-muted-foreground/70 flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">ℹ</span>
                <span>
                  You&apos;ll get a tracking snippet and instructions after
                  creating the site.
                </span>
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
