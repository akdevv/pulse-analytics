import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Site } from "@/lib/types/site.types";

interface SiteCardProps {
  site: Site;
}

export function SiteCard({ site }: SiteCardProps) {
  return (
    <Link href={`/dashboard/sites/${site.id}`}>
      <Card className="hover:border-foreground/30 cursor-pointer transition-colors">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{site.name}</CardTitle>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                site.isActive
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {site.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <CardDescription>{site.domain}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-60">Tier</p>
              <p className="font-medium capitalize">
                {site.rateLimitTier.toLowerCase()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-60">
                Tracking ID
              </p>
              <p className="font-mono text-xs truncate">{site.trackingId}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
