"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { membershipEndAfterRenew } from "@/lib/membership";
import { formatDateIST } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";

function apiErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === "object" && "response" in e) {
    const err = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
    if (err) return err;
  }
  return fallback;
}

type AdminClientActionsProps = {
  clientId: string;
  clientName: string;
  membershipStart?: string | null;
  membershipEnd?: string | null;
  totalSessions?: number;
  size?: "sm" | "default";
  onChanged?: () => void;
  redirectAfterRemove?: string;
};

function AdminClientActionsPanel({
  clientId,
  clientName,
  membershipStart,
  membershipEnd,
  totalSessions,
  size = "sm",
  onChanged,
  redirectAfterRemove,
}: AdminClientActionsProps) {
  const router = useRouter();
  const [renewOpen, setRenewOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addSessions, setAddSessions] = useState(10);
  const [confirmName, setConfirmName] = useState("");

  const previewEnd = useMemo(
    () => membershipEndAfterRenew(membershipEnd, addSessions),
    [membershipEnd, addSessions],
  );

  const previewTotal = (totalSessions ?? 0) + (addSessions > 0 ? addSessions : 0);

  async function renew() {
    if (addSessions < 1) {
      toast.error("Add at least 1 session");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<{ membershipEnd: string; totalSessions: number }>(
        `/clients/${clientId}/extend-membership`,
        { addSessions },
      );
      toast.success(
        `Renewed ${clientName} — ${data.totalSessions} sessions, ends ${formatDateIST(data.membershipEnd)}`,
      );
      setRenewOpen(false);
      onChanged?.();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not renew membership"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (confirmName.trim() !== clientName.trim()) {
      toast.error("Type the client name exactly to confirm removal");
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/clients/${clientId}`);
      toast.success(`${clientName} removed`);
      setRemoveOpen(false);
      if (redirectAfterRemove) {
        router.push(redirectAfterRemove);
      } else {
        onChanged?.();
      }
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not remove client"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size={size} variant="outline" onClick={() => setRenewOpen(true)}>
          Renew
        </Button>
        <Button type="button" size={size} variant="destructive" onClick={() => setRemoveOpen(true)}>
          Remove
        </Button>
      </div>

      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew membership</DialogTitle>
            <DialogDescription>
              Add sessions for {clientName}. End date extends automatically (one session per calendar day).
              {membershipStart || membershipEnd ? (
                <>
                  {" "}
                  Current window: {formatDateIST(membershipStart)} → {formatDateIST(membershipEnd)}
                  {totalSessions != null ? ` · ${totalSessions} sessions` : ""}.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor={`renew-sessions-${clientId}`}>Sessions to add</Label>
              <Input
                id={`renew-sessions-${clientId}`}
                type="number"
                min={1}
                value={addSessions}
                onChange={(e) => setAddSessions(Number(e.target.value))}
              />
            </div>
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
              <p>
                <span className="text-muted-foreground">New package: </span>
                <span className="font-medium">{previewTotal} sessions</span>
              </p>
              <p>
                <span className="text-muted-foreground">New end date: </span>
                <span className="font-medium">{formatDateIST(previewEnd)}</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenewOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={renew} disabled={busy || addSessions < 1}>
              {busy ? "Renewing…" : "Confirm renewal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeOpen}
        onOpenChange={(open) => {
          setRemoveOpen(open);
          if (!open) setConfirmName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove client</DialogTitle>
            <DialogDescription>
              Permanently deletes {clientName} and their login. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`remove-confirm-${clientId}`}>Type {clientName} to confirm</Label>
            <Input
              id={`remove-confirm-${clientId}`}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={clientName}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={remove}
              disabled={busy || confirmName.trim() !== clientName.trim()}
            >
              {busy ? "Removing…" : "Remove permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AdminClientActions(props: AdminClientActionsProps) {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== "ADMIN") return null;
  return <AdminClientActionsPanel {...props} />;
}
