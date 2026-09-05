"use client";

import { useEffect, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useSite } from "@/hooks/useSites";
import { getErrorMessage } from "@/lib/utils";

function getCurlCommand(trackingId: string, domain: string) {
  const origin = domain.startsWith("http") ? domain : `https://${domain}`;
  return `curl -X POST "${process.env.NEXT_PUBLIC_API_URL}/track" \\
  -G \\
  --data-urlencode "v=1" \\
  --data-urlencode "tid=${trackingId}" \\
  --data-urlencode "t=PAGEVIEW" \\
  --data-urlencode "dl=${origin}/" \\
  --data-urlencode "dt=Home" \\
  --data-urlencode "dr=" \\
  --data-urlencode "sr=1920x1080" \\
  --data-urlencode "vp=1280x800" \\
  --data-urlencode "ul=en-US"`;
}

// pulse.js appends /api/v1/track itself, so data-host is the API origin
// without the /api/v1 suffix that NEXT_PUBLIC_API_URL carries. Resolved per
// render, not at module scope: `new URL(undefined!)` throws on import, which
// takes down the route before it can say what is misconfigured.
function getApiOrigin() {
  const url = process.env.NEXT_PUBLIC_API_URL;
  return url ? new URL(url).origin : "";
}

function getSnippet(trackingId: string) {
  const apiOrigin = getApiOrigin();
  return `<!-- Pulse Analytics -->
<script src="${apiOrigin}/pulse.js" data-tid="${trackingId}" data-host="${apiOrigin}"></script>`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
    >
      {copied ? (
        <GoCheck className="size-3.5 text-success" />
      ) : (
        <GoCopy className="size-3.5" />
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function SiteSetupPage() {
  const { id } = useParams<{ id: string }>();
  const { data: site, isLoading, error } = useSite(id);

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <p className="p-1 text-sm text-destructive">
        {getErrorMessage(error, "Site not found.")}
      </p>
    );
  }

  const snippet = getSnippet(site.trackingId);
  const curlCmd = getCurlCommand(site.trackingId, site.domain);

  return (
    <div className="space-y-6 p-1">
      {/* Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="overflow-hidden py-0">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
              Tier
            </p>
            <p className="mt-2 text-sm font-semibold capitalize">
              {site.rateLimitTier.toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
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

        <Card className="overflow-hidden py-0">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
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
        <CardContent className="px-5 pt-3 pb-2">
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
                <dt className="text-xs font-medium text-muted-foreground">
                  {label}
                </dt>
                <dd className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
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
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  &lt;head&gt;
                </code>{" "}
                tag of your site.
              </CardDescription>
            </div>
            <CopyButton text={snippet} />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <pre className="overflow-x-auto rounded-lg border border-border bg-charcoal p-4 text-[11px] leading-relaxed text-ink/80">
            <code>{snippet}</code>
          </pre>
        </CardContent>
      </Card>

      {/* Quick Test */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">
                Quick Test
              </CardTitle>
              <CardDescription className="text-xs">
                Fire a test pageview from your terminal to verify tracking is
                working.
              </CardDescription>
            </div>
            <CopyButton text={curlCmd} />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <pre className="overflow-x-auto rounded-lg border border-border bg-charcoal p-4 text-[11px] leading-relaxed text-ink/80">
            <code>{curlCmd}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
