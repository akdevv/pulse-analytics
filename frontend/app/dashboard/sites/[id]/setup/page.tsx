"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { GoCheck, GoCopy } from "react-icons/go";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSiteById } from "@/lib/api/sites.api";
import type { Site } from "@/lib/types/site.types";

function getSnippet(trackingId: string) {
  return `<!-- Pulse Analytics -->
<script src="https://api.pulse.com/pulse-sdk.js?trackingId=${trackingId}"></script>
<script>
  window.pulse = {
    trackingId: "${trackingId}"
  };
</script>`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-accent text-muted-foreground hover:text-foreground"
    >
      {copied ? (
        <GoCheck className="size-3.5 text-green-500" />
      ) : (
        <GoCopy className="size-3.5" />
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function SiteSetupPage() {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSiteById(id)
      .then(setSite)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-muted-foreground text-sm p-1">Loading...</div>;
  }

  if (!site) {
    return (
      <div className="text-muted-foreground text-sm p-1">Site not found.</div>
    );
  }

  const snippet = getSnippet(site.trackingId);

  return (
    <div className="space-y-6 p-1">
      {/* Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="py-0 overflow-hidden">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-widest">
              Tier
            </p>
            <p className="mt-2 text-sm font-semibold capitalize">
              {site.rateLimitTier.toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card className="py-0 overflow-hidden">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-widest">
              Created
            </p>
            <p className="mt-2 text-sm font-semibold">
              {new Date(site.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="py-0 overflow-hidden">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-widest">
              Last Updated
            </p>
            <p className="mt-2 text-sm font-semibold">
              {new Date(site.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tracking Details */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5 pb-0">
          <CardTitle className="text-sm font-semibold">
            Tracking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-2 pt-3">
          <dl>
            {[
              { label: "Site ID", value: site.id },
              { label: "Tracking ID", value: site.trackingId },
              { label: "Domain", value: site.domain },
            ].map(({ label, value }, i, arr) => (
              <div
                key={label}
                className={`flex items-center justify-between py-3 text-sm ${
                  i < arr.length - 1 ? "border-b" : ""
                }`}
              >
                <dt className="text-muted-foreground text-xs font-medium">
                  {label}
                </dt>
                <dd className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Tracking Snippet */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">
                Tracking Snippet
              </CardTitle>
              <CardDescription className="text-xs">
                Paste this inside the{" "}
                <code className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">
                  &lt;head&gt;
                </code>{" "}
                tag of your site.
              </CardDescription>
            </div>
            <CopyButton text={snippet} />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <pre className="bg-zinc-950 dark:bg-zinc-900 text-zinc-300 overflow-x-auto rounded-lg p-4 text-[11px] leading-relaxed border border-zinc-800">
            <code>{snippet}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
