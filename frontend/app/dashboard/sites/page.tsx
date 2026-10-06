import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SitesList } from "@/components/sites/sites-list";

export default function SitesPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--seam)] px-5 py-4">
        <h1 className="figure text-[20px]">Sites</h1>
        <Button size="sm" className="cursor-pointer" asChild>
          <Link href="/dashboard/sites/new">
            <Plus />
            <span>Add site</span>
          </Link>
        </Button>
      </div>

      <div className="p-5">
        <SitesList />
      </div>
    </>
  );
}
