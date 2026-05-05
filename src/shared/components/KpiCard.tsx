type KpiCardProps = {
  label: string;
  value: number;
  href?: string;
  borderColor?: string;
  sub?: string;
};

export function KpiCard({ label, value, href, borderColor, sub }: KpiCardProps) {
  const inner = (
    <div
      className="rounded-lg border bg-card p-4 flex flex-col gap-1"
      style={borderColor ? { borderLeftColor: borderColor, borderLeftWidth: 4 } : undefined}
    >
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:opacity-80 transition-opacity">
        {inner}
      </a>
    );
  }
  return inner;
}
