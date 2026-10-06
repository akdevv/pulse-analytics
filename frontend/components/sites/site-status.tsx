export function SiteStatus({
  active,
  label,
  className = "",
}: {
  active: boolean;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`meta flex shrink-0 items-center gap-1.5 ${
        active ? "text-success" : "text-foreground/40"
      } ${className}`}
    >
      <span
        className={`size-1.5 rounded-full ${active ? "bg-success" : "bg-foreground/30"}`}
      />
      {active ? label : "Paused"}
    </span>
  );
}
