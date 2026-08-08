import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, type Redirect } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  redirect?: Redirect | null;
}

const emptyForm = { path: "", destinationUrl: "", title: "", enabled: true, expiresAt: "", password: "" };

export function RedirectDialog({ open, onClose, onSaved, redirect }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [removePassword, setRemovePassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRemovePassword(false);
    setForm(
      redirect
        ? {
            path: redirect.path,
            destinationUrl: redirect.destinationUrl,
            title: redirect.title || "",
            enabled: redirect.enabled,
            expiresAt: redirect.expiresAt ? new Date(redirect.expiresAt).toISOString().slice(0, 16) : "",
            password: "",
          }
        : emptyForm,
    );
  }, [open, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      path: form.path.trim(),
      destinationUrl: form.destinationUrl.trim(),
      title: form.title.trim() || null,
      enabled: form.enabled,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    if (form.password) payload.password = form.password;
    if (redirect && removePassword) payload.removePassword = true;

    try {
      if (redirect) {
        await api(`/api/redirects/${redirect.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Redirect updated");
      } else {
        await api("/api/redirects", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Redirect created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={redirect ? "Edit redirect" : "New redirect"}
      description="QR codes always point at this server; the destination can change any time."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="path">Path</Label>
          <Input
            id="path"
            value={form.path}
            onChange={(e) => setForm({ ...form, path: e.target.value })}
            placeholder="promo"
            required
            maxLength={64}
          />
          <p className="mt-1 text-xs text-muted-foreground">Letters, numbers, dot, dash, underscore only.</p>
        </div>
        <div>
          <Label htmlFor="destination">Destination URL</Label>
          <Input
            id="destination"
            type="url"
            value={form.destinationUrl}
            onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })}
            placeholder="https://example.com/summer-sale"
            required
            maxLength={2048}
          />
        </div>
        <div>
          <Label htmlFor="title">Label (optional)</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Summer campaign"
            maxLength={120}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="expires">Expires at (optional)</Label>
            <Input
              id="expires"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="password">{redirect?.hasPassword ? "New password" : "Password (optional)"}</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank for none"
              minLength={4}
            />
          </div>
        </div>
        {redirect?.hasPassword && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={removePassword}
              onChange={(e) => setRemovePassword(e.target.checked)}
              className="h-4 w-4 accent-current"
            />
            Remove existing password protection
          </label>
        )}
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <p className="text-sm font-medium">Enabled</p>
            <p className="text-xs text-muted-foreground">Disabled links show a friendly notice instead.</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} label="Enabled" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : redirect ? "Save changes" : "Create redirect"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
