"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/common/section-card";
import { SiteTabs } from "@/components/sites/site-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteSite,
  useRegenTrackingKey,
  useSite,
  useUpdateSite,
} from "@/hooks/useSites";
import type { Site } from "@/lib/types/site.types";
import { getErrorMessage } from "@/lib/utils";

function GeneralCard({ site }: { site: Site }) {
  const update = useUpdateSite(site.id);
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain);

  const save = () =>
    update.mutate(
      { name, domain },
      {
        onSuccess: () => toast.success("Site updated successfully."),
        onError: (err) =>
          toast.error(getErrorMessage(err, "Failed to update site.")),
      }
    );

  return (
    <SectionCard
      title="General"
      description="Update your site name and domain."
    >
      <div className="space-y-2">
        <Label htmlFor="name" className="text-xs font-medium">
          Site Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Website"
          className="h-9 text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="domain" className="text-xs font-medium">
          Domain
        </Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="h-9 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Enter the domain without https:// (e.g. example.com)
        </p>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={update.isPending}>
          {update.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </SectionCard>
  );
}

function TrackingKeyCard({ site }: { site: Site }) {
  const regen = useRegenTrackingKey(site.id);

  const regenerate = () =>
    regen.mutate(undefined, {
      onSuccess: () => toast.success("Tracking key regenerated."),
      onError: (err) =>
        toast.error(getErrorMessage(err, "Failed to regenerate tracking key.")),
    });

  return (
    <SectionCard
      title="Tracking Key"
      description="Regenerate your tracking key if it has been compromised. Your existing snippet will stop working until updated with the new key."
    >
      <div className="rounded-lg border bg-muted/50 px-3.5 py-3">
        <code className="block truncate font-mono text-xs text-muted-foreground">
          {site.trackingId}
        </code>
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={regenerate}
          disabled={regen.isPending}
          className="gap-1.5"
        >
          <RefreshCw
            className={`size-3.5 ${regen.isPending ? "animate-spin" : ""}`}
          />
          {regen.isPending ? "Regenerating..." : "Regenerate"}
        </Button>
      </div>
    </SectionCard>
  );
}

function DangerCard({ site }: { site: Site }) {
  const router = useRouter();
  const remove = useDeleteSite(site.id);
  const [confirming, setConfirming] = useState(false);

  const deleteSite = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success("Site deleted.");
        router.replace("/dashboard/sites");
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, "Failed to delete site."));
        setConfirming(false);
      },
    });

  return (
    <SectionCard
      tone="danger"
      title="Danger Zone"
      description="Irreversible actions that permanently affect this site."
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Delete this site</p>
          <p className="text-xs text-muted-foreground">
            {confirming
              ? `This deletes ${site.domain} and every event recorded for it. There is no undo.`
              : "Permanently removes the site and all associated analytics data. This cannot be undone."}
          </p>
        </div>
        {confirming ? (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSite}
              disabled={remove.isPending}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              {remove.isPending ? "Deleting..." : "Yes, delete"}
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
            className="shrink-0 gap-1.5"
          >
            <Trash2 className="size-3.5" />
            Delete Site
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

export default function SiteSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: site, isLoading, error } = useSite(id);

  return (
    <>
      <SiteTabs />
      <div className="max-w-2xl space-y-5 p-5">
        {isLoading ? (
          <>
            <Skeleton className="h-56" />
            <Skeleton className="h-40" />
          </>
        ) : !site ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(error, "Site not found.")}
          </p>
        ) : (
          <>
            <GeneralCard site={site} />
            <TrackingKeyCard site={site} />
            <DangerCard site={site} />
          </>
        )}
      </div>
    </>
  );
}
