"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  createdAt: string;
  actor: { email: string; role: string };
};

export default function AdminAuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Row[] }>("/audit?pageSize=80")
      .then((res) => setRows(res.data.data))
      .catch(() => toast.error("Unable to load audit logs"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit logs</h1>
        <p className="text-sm text-muted-foreground">Immutable ledger of privileged mutations.</p>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Recent actions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div>{r.actor.email}</div>
                      <div className="text-xs text-muted-foreground">{r.actor.role}</div>
                    </TableCell>
                    <TableCell>
                      {r.entity} · <span className="text-muted-foreground">{r.entityId.slice(0, 8)}…</span>
                    </TableCell>
                    <TableCell>{r.action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
