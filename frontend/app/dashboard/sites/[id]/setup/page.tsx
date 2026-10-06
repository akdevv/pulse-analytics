"use client";

import { useParams } from "next/navigation";
import { CopyButton } from "@/components/common/copy-button";
import { SectionCard } from "@/components/common/section-card";
import { SiteTabs } from "@/components/sites/site-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSite } from "@/hooks/useSites";
import type { Site } from "@/lib/types/site.types";
import { getErrorMessage } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
// pulse.js appends /api/v1/track itself, so it needs the bare origin.
const API_ORIGIN = API_URL ? new URL(API_URL).origin : "";

const DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function getSnippet(trackingId: string) {
  return `<!-- Pulse Analytics -->
<script src="${API_ORIGIN}/pulse.js" data-tid="${trackingId}" data-host="${API_ORIGIN}"></script>`;
}

function getCurlCommand(trackingId: string, domain: string) {
  const origin = domain.startsWith("http") ? domain : `https://${domain}`;
  return `curl -X POST "${API_URL}/track" \\
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

function CodeCard({
  title,
  description,
  code,
}: {
  title: string;
  description: React.ReactNode;
  code: string;
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      action={<CopyButton text={code} />}
      divided={false}
    >
      <pre className="overflow-x-auto rounded-lg border border-border bg-charcoal p-4 text-[11px] leading-relaxed text-ink/80">
        <code>{code}</code>
      </pre>
    </SectionCard>
  );
}

function SetupDetails({ site }: { site: Site }) {
  const stats = [
    { label: "Tier", value: site.rateLimitTier.toLowerCase() },
    { label: "Created", value: DATE.format(new Date(site.createdAt)) },
    { label: "Last Updated", value: DATE.format(new Date(site.updatedAt)) },
  ];
  const ids = [
    { label: "Site ID", value: site.id },
    { label: "Tracking ID", value: site.trackingId },
    { label: "Domain", value: site.domain },
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value }) => (
          <Card key={label} className="overflow-hidden py-0">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                {label}
              </p>
              <p className="mt-2 text-sm font-semibold capitalize">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionCard title="Tracking Details">
        <dl className="-my-3 divide-y">
          {ids.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <dt className="text-xs font-medium text-muted-foreground">
                {label}
              </dt>
              <dd className="truncate rounded bg-muted px-2 py-0.5 font-mono text-xs">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <CodeCard
        title="Tracking Snippet"
        description={
          <>
            Paste this inside the{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              &lt;head&gt;
            </code>{" "}
            tag of your site.
          </>
        }
        code={getSnippet(site.trackingId)}
      />

      <CodeCard
        title="Quick Test"
        description="Fire a test pageview from your terminal to verify tracking is working."
        code={getCurlCommand(site.trackingId, site.domain)}
      />
    </>
  );
}

export default function SiteSetupPage() {
  const { id } = useParams<{ id: string }>();
  const { data: site, isLoading, error } = useSite(id);

  return (
    <>
      <SiteTabs />
      <div className="space-y-5 p-5">
        {isLoading ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </>
        ) : !site ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(error, "Site not found.")}
          </p>
        ) : (
          <SetupDetails site={site} />
        )}
      </div>
    </>
  );
}
