"use client";

import { NewSiteForm } from "@/components/sites/new-site-form";

export default function NewSitePage() {
  return (
    <>
      <div className="border-b border-[var(--seam)] px-5 py-4">
        <h1 className="figure text-[20px]">Add a site</h1>
        <p className="mt-1.5 text-sm text-foreground/45">
          A name and a domain. You get the snippet on the next screen.
        </p>
      </div>
      <div className="max-w-xl p-5">
        <NewSiteForm />
      </div>
    </>
  );
}
