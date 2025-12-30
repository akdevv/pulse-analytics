import Link from "next/link";
import { GoPlus } from "react-icons/go";
import { Button } from "@/components/ui/button";

export default function SitesPage() {
  return (
    <div>
      <Button className="cursor-pointer" asChild>
        <Link href="/dashboard/sites/new">
          <GoPlus />
          <span>Add Site</span>
        </Link>
      </Button>
    </div>
  );
}
