import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export function ScanChart({ data }: { data: { date: string; scans: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => v.slice(5)}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(var(--foreground))",
            }}
          />
          <Area type="monotone" dataKey="scans" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#scanFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownList({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  return (
    <div>
      <p className="mb-3 text-sm font-medium">{title}</p>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet</p>
      ) : (
        <ul className="space-y-2.5">
          {data.slice(0, 6).map((d) => (
            <li key={d.name}>
              <div className="flex justify-between text-xs">
                <span className="capitalize">{d.name}</span>
                <span className="tabular-nums text-muted-foreground">{d.value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(d.value / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
