"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IoArrowBackOutline } from "react-icons/io5";
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
import {
  getSiteById,
  updateSite,
  deleteSite,
  regenTrackingKey,
} from "@/lib/api/sites.api";
import type { Site } from "@/lib/types/site.types";

export default function SiteSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getSiteById(id)
      .then((s) => {
        setSite(s);
        setName(s?.name ?? "");
        setDomain(s?.domain ?? "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-1 text-sm text-muted-foreground">Loading...</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSite(id, { name, domain });
      setSite(updated);
      toast.success("Site updated successfully.");
    } catch {
      toast.error("Failed to update site. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRegen = async () => {
    setRegenerating(true);
    try {
      const updated = await regenTrackingKey(id);
      setSite(updated);
      toast.success("Tracking key regenerated.");
    } catch {
      toast.error("Failed to regenerate tracking key. Please try again.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSite(id);
      toast.success("Site deleted.");
      router.replace("/dashboard/sites");
    } catch {
      toast.error("Failed to delete site. Please try again.");
      setDeleting(false);
    }
  };

  if (!site) {
    return (
      <div className="p-1 text-sm text-muted-foreground">Site not found.</div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
          <Link href={`/dashboard/sites/${id}`}>
            <IoArrowBackOutline className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="truncate text-sm text-muted-foreground">{site.name}</p>
        </div>
      </div>

      {/* General */}
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
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
              disabled={regenerating}
              className="gap-1.5"
            >
              <TbRefresh
                className={`size-3.5 ${regenerating ? "animate-spin" : ""}`}
              />
              {regenerating ? "Regenerating..." : "Regenerate"}
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
                Permanently removes the site and all associated analytics data.
                This cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="shrink-0 gap-1.5"
            >
              <GoTrash className="size-3.5" />
              {deleting ? "Deleting..." : "Delete Site"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
