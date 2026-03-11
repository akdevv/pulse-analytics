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
      className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
    >
      {copied ? (
        <GoCheck className="size-3.5" />
      ) : (
        <GoCopy className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function SitePage() {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSiteById(id)
      .then(setSite)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading...</div>;
  }

  if (!site) {
    return <div className="text-muted-foreground text-sm">Site not found.</div>;
  }

  const snippet = getSnippet(site.trackingId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{site.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{site.domain}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Status
            </p>
            <p className="mt-1 font-medium">
              <span
                className={`inline-flex items-center gap-1.5 text-sm ${
                  site.isActive
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    site.isActive ? "bg-green-500" : "bg-muted-foreground"
                  }`}
                />
                {site.isActive ? "Active" : "Inactive"}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Tier
            </p>
            <p className="mt-1 text-sm font-medium capitalize">
              {site.rateLimitTier.toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Created
            </p>
            <p className="mt-1 text-sm font-medium">
              {new Date(site.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Updated
            </p>
            <p className="mt-1 text-sm font-medium">
              {new Date(site.updatedAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracking Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            {[
              { label: "Site ID", value: site.id },
              { label: "Tracking ID", value: site.trackingId },
              { label: "Domain", value: site.domain },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between py-3 text-sm"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono text-xs">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tracking Snippet</CardTitle>
              <CardDescription className="mt-1">
                Paste this inside the{" "}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">
                  &lt;head&gt;
                </code>{" "}
                tag of your site.
              </CardDescription>
            </div>
            <CopyButton text={snippet} />
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
            <code>{snippet}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
