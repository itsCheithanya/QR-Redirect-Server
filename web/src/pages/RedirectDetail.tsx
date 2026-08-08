import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BreakdownList, ScanChart } from "@/components/ScanChart";
import { QrPreview } from "@/components/QrPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, download, type Redirect } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Detail {
  totals: { totalScans: number; scansInRange: number; uniqueVisitors: number };
  timeseries: { date: string; scans: number }[];
  devices: { name: string; value: number }[];
  browsers: { name: string; value: number }[];
  countries: { name: string; value: number }[];
  history: { id: string; createdAt: string; device: string | null; os: string | null; browser: string | null; country: string | null }[];
}

export default function RedirectDetail() {
  const { id = "" } = useParams();
  const redirect = useQuery({ queryKey: ["redirect", id], queryFn: () => api<Redirect>(`/api/redirects/${id}`) });
  const stats = useQuery({ queryKey: ["redirect-stats", id], queryFn: () => api<Detail>(`/api/analytics/redirects/${id}?days=30`) });

  if (redirect.isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  if (!redirect.data) return <p className="p-8 text-sm text-muted-foreground">Redirect not found.</p>;
  const r = redirect.data;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-5 pt-5 sm:flex-row">
          <QrPreview value={r.qrUrl} size={160} className="shrink-0 self-start" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">/{r.path}</h1>
              {r.enabled ? <Badge tone="success">Enabled</Badge> : <Badge tone="muted">Disabled</Badge>}
              {r.hasPassword && <Badge tone="accent">Protected</Badge>}
            </div>
            <p className="mt-1 break-all text-sm text-muted-foreground">{r.qrUrl}</p>
            <a href={r.destinationUrl} target="_blank" rel="noreferrer noopener" className="mt-2 block break-all text-sm text-primary hover:underline">
              → {r.destinationUrl}
            </a>
            <p className="mt-2 text-xs text-muted-foreground">
              Created {formatDate(r.createdAt)} · Updated {formatDate(r.updatedAt)}
              {r.expiresAt ? ` · Expires ${formatDate(r.expiresAt)}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(r.qrUrl); toast.success("Copied"); }}>
                <Copy className="h-3.5 w-3.5" /> Copy URL
              </Button>
              <Button variant="outline" size="sm" onClick={() => download(`/api/redirects/${r.id}/qr.png?size=2048`, `${r.path}.png`)}>
                <Download className="h-3.5 w-3.5" /> PNG (2048px)
              </Button>
              <Button variant="outline" size="sm" onClick={() => download(`/api/redirects/${r.id}/qr.svg`, `${r.path}.svg`)}>
                <Download className="h-3.5 w-3.5" /> SVG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total scans", value: stats.data?.totals.totalScans ?? 0 },
          { label: "Scans (30d)", value: stats.data?.totals.scansInRange ?? 0 },
          { label: "Unique visitors (30d)", value: stats.data?.totals.uniqueVisitors ?? 0 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader><CardTitle>Scans over time</CardTitle></CardHeader>
        <CardContent><ScanChart data={stats.data?.timeseries ?? []} /></CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-5"><BreakdownList title="Devices" data={stats.data?.devices ?? []} /></CardContent></Card>
        <Card><CardContent className="pt-5"><BreakdownList title="Browsers" data={stats.data?.browsers ?? []} /></CardContent></Card>
        <Card><CardContent className="pt-5"><BreakdownList title="Countries" data={stats.data?.countries ?? []} /></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent scan history</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {(stats.data?.history.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No scans recorded yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Timestamp</th>
                  <th className="py-2 pr-4 font-medium">Device</th>
                  <th className="py-2 pr-4 font-medium">OS</th>
                  <th className="py-2 pr-4 font-medium">Browser</th>
                  <th className="py-2 font-medium">Country</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.data!.history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDate(h.createdAt)}</td>
                    <td className="py-2 pr-4 capitalize">{h.device || "—"}</td>
                    <td className="py-2 pr-4">{h.os || "—"}</td>
                    <td className="py-2 pr-4">{h.browser || "—"}</td>
                    <td className="py-2">{h.country || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
