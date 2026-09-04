"use client";

import { NewSiteForm } from "@/components/sites/new-site-form";

export default function NewSitePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Add a new Site</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your website to start collecting analytics data.
        </p>
      </div>
      <NewSiteForm />
    </div>
  );
}
