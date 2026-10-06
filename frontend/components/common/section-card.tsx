import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  action,
  tone = "default",
  divided = true,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "default" | "danger";
  divided?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const danger = tone === "danger";
  return (
    <Card
      className={cn(
        "gap-0 py-0",
        danger && "border-destructive/30 bg-destructive/2",
        className
      )}
    >
      <CardHeader
        className={cn(
          "flex items-start justify-between gap-4 px-5 pt-5 pb-4",
          divided && "border-b",
          danger && "border-destructive/20"
        )}
      >
        <div className="space-y-1">
          <CardTitle
            className={cn(
              "text-sm font-semibold",
              danger && "text-destructive"
            )}
          >
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn("space-y-5 px-5 pb-5", divided && "pt-5")}>
        {children}
      </CardContent>
    </Card>
  );
}
