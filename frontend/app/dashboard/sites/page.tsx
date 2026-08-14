import Link from "next/link";
import { GoPlus } from "react-icons/go";
import { Button } from "@/components/ui/button";
import { SitesList } from "@/components/sites/sites-list";

export default function SitesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sites</h1>
        <Button className="cursor-pointer" asChild>
          <Link href="/dashboard/sites/new">
            <GoPlus />
            <span>Add Site</span>
          </Link>
        </Button>
      </div>

      <SitesList />
    </div>
  );
}
