import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3, Copy, Download, FileArchive, Link2, LogOut, Pencil, Plus, QrCode, Search, Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { QrPreview } from "@/components/QrPreview";
import { RedirectDialog } from "@/components/RedirectDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { api, clearToken, download, type Overview, type Redirect } from "@/lib/api";
import { formatDate, isExpired } from "@/lib/utils";
import { ScanChart } from "@/components/ScanChart";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Redirect | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const redirects = useQuery({
    queryKey: ["redirects", status],
    queryFn: () => api<{ total: number; items: Redirect[] }>(`/api/redirects?status=${status}&limit=500`),
  });
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: () => api<Overview>("/api/analytics/overview?days=30"),
  });

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = redirects.data?.items ?? [];
    if (!q) return list;
    return list.filter((r) =>
      [r.path, r.destinationUrl, r.title || ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [redirects.data, search]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["redirects"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
  };

  const remove = async (r: Redirect) => {
    if (!confirm(`Delete /${r.path}? Printed QR codes will stop working.`)) return;
    try {
      await api(`/api/redirects/${r.id}`, { method: "DELETE" });
      toast.success("Redirect deleted");
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Redirect URL copied");
  };

  const totals = overview.data?.totals;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-sm font-semibold leading-tight">QR Redirect Server</h1>
              <p className="text-xs text-muted-foreground">Dynamic QR management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => download("/api/redirects/export/zip", "qr-codes.zip")}>
              <FileArchive className="h-4 w-4" /> <span className="hidden sm:inline">Export ZIP</span>
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New redirect</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => { clearToken(); navigate("/login"); }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Redirects", value: totals?.redirects ?? 0, hint: `${totals?.activeRedirects ?? 0} active` },
            { label: "Total scans", value: totals?.totalScans ?? 0, hint: "all time" },
            { label: "Scans (30d)", value: totals?.scansInRange ?? 0, hint: "last 30 days" },
            { label: "Unique visitors", value: totals?.uniqueVisitors ?? 0, hint: "last 30 days" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Scan activity — last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <ScanChart data={overview.data?.timeseries ?? []} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by path, label or destination…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search redirects"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="expired">Expired</option>
          </Select>
        </div>

        {redirects.isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading redirects…</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <Link2 className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No redirects yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Create your first mapping — the QR code stays the same while the destination can change any time.
              </p>
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4" /> New redirect
              </Button>
            </CardContent>
          </Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((r) => (
              <Card key={r.id} className="flex flex-col">
                <CardContent className="flex flex-1 gap-4 pt-5">
                  <QrPreview value={r.qrUrl} size={116} className="shrink-0 self-start" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-semibold">/{r.path}</p>
                      {r.enabled ? <Badge tone="success">Enabled</Badge> : <Badge tone="muted">Disabled</Badge>}
                      {isExpired(r.expiresAt) && <Badge tone="destructive">Expired</Badge>}
                      {r.hasPassword && <Badge tone="accent">Protected</Badge>}
                    </div>
                    {r.title && <p className="truncate text-sm text-muted-foreground">{r.title}</p>}
                    <a
                      href={r.destinationUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 block truncate text-sm text-primary hover:underline"
                    >
                      {r.destinationUrl}
                    </a>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.scanCount} scans · created {formatDate(r.createdAt)}
                    </p>
                    {r.expiresAt && (
                      <p className="text-xs text-muted-foreground">Expires {formatDate(r.expiresAt)}</p>
                    )}
                  </div>
                </CardContent>
                <div className="flex flex-wrap gap-1.5 border-t border-border p-3">
                  <Button variant="outline" size="sm" onClick={() => copy(r.qrUrl)}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => download(`/api/redirects/${r.id}/qr.png?size=1024`, `${r.path}.png`)}>
                    <Download className="h-3.5 w-3.5" /> PNG
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => download(`/api/redirects/${r.id}/qr.svg`, `${r.path}.svg`)}>
                    <Download className="h-3.5 w-3.5" /> SVG
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/redirects/${r.id}`)}>
                    <BarChart3 className="h-3.5 w-3.5" /> Stats
                  </Button>
                  <div className="ml-auto flex gap-1.5">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(r); setDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(r)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        )}

        {overview.data && overview.data.topRedirects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top performing redirects</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {overview.data.topRedirects.map((t) => (
                <Link
                  key={t.id}
                  to={`/redirects/${t.id}`}
                  className="flex items-center justify-between gap-4 py-2.5 text-sm hover:text-primary"
                >
                  <span className="truncate font-medium">/{t.path}</span>
                  <span className="tabular-nums text-muted-foreground">{t.scanCount} scans</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      <RedirectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={refresh} redirect={editing} />
    </div>
  );
}
