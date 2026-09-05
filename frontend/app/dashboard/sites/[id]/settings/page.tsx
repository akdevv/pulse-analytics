"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TbRefresh } from "react-icons/tb";
import { GoTrash } from "react-icons/go";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteTabs } from "@/components/sites/site-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteSite,
  useRegenTrackingKey,
  useSite,
  useUpdateSite,
} from "@/hooks/useSites";
import type { Site } from "@/lib/types/site.types";
import { getErrorMessage } from "@/lib/utils";

/** Its own component so the inputs can be seeded from the loaded site at
    mount. Held in the page, they needed an effect to copy the fetched values
    across, which re-renders the whole page on every arrival. */
function GeneralCard({ site }: { site: Site }) {
  const update = useUpdateSite(site.id);
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain);

  const handleSave = () =>
    update.mutate(
      { name, domain },
      {
        onSuccess: () => toast.success("Site updated successfully."),
        onError: (err) =>
          toast.error(getErrorMessage(err, "Failed to update site.")),
      }
    );

  return (
    <Card className="py-0">
      <CardHeader className="border-b px-5 pt-5 pb-4">
        <CardTitle className="text-sm font-semibold">General</CardTitle>
        <CardDescription className="text-xs">
          Update your site name and domain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 py-5">
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
        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SiteSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: site, isLoading, error } = useSite(id);
  const regen = useRegenTrackingKey(id);
  const remove = useDeleteSite(id);

  // Deleting a site drops its analytics with it, so the button asks twice.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6 p-1">
        <SiteTabs />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="max-w-2xl space-y-6 p-1">
        <SiteTabs />
        <p className="text-sm text-destructive">
          {getErrorMessage(error, "Site not found.")}
        </p>
      </div>
    );
  }

  const handleRegen = () =>
    regen.mutate(undefined, {
      onSuccess: () => toast.success("Tracking key regenerated."),
      onError: (err) =>
        toast.error(getErrorMessage(err, "Failed to regenerate tracking key.")),
    });

  const handleDelete = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success("Site deleted.");
        router.replace("/dashboard/sites");
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, "Failed to delete site."));
        setConfirmingDelete(false);
      },
    });

  return (
    <div className="max-w-2xl space-y-6 p-1">
      <SiteTabs />

      <GeneralCard site={site} />

      {/* Tracking Key */}
      <Card className="py-0">
        <CardHeader className="border-b px-5 pt-5 pb-4">
          <CardTitle className="text-sm font-semibold">Tracking Key</CardTitle>
          <CardDescription className="text-xs">
            Regenerate your tracking key if it has been compromised. Your
            existing snippet will stop working until updated with the new key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 py-5">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/50 px-3.5 py-3">
            <code className="truncate font-mono text-xs text-muted-foreground">
              {site.trackingId}
            </code>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegen}
              disabled={regen.isPending}
              className="gap-1.5"
            >
              <TbRefresh
                className={`size-3.5 ${regen.isPending ? "animate-spin" : ""}`}
              />
              {regen.isPending ? "Regenerating..." : "Regenerate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/2 py-0">
        <CardHeader className="border-b border-destructive/20 px-5 pt-5 pb-4">
          <CardTitle className="text-sm font-semibold text-destructive">
            Danger Zone
          </CardTitle>
          <CardDescription className="text-xs">
            Irreversible actions that permanently affect this site.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Delete this site</p>
              <p className="text-xs text-muted-foreground">
                {confirmingDelete
                  ? `This deletes ${site.domain} and every event recorded for it. There is no undo.`
                  : "Permanently removes the site and all associated analytics data. This cannot be undone."}
              </p>
            </div>
            {confirmingDelete ? (
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={remove.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={remove.isPending}
                  className="gap-1.5"
                >
                  <GoTrash className="size-3.5" />
                  {remove.isPending ? "Deleting..." : "Yes, delete"}
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
                className="shrink-0 gap-1.5"
              >
                <GoTrash className="size-3.5" />
                Delete Site
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
