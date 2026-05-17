"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  sessionDate: string;
  trainerStatus: string;
  clientStatus: string;
  sessionCompleted: boolean;
  client: { user: { firstName: string; lastName: string } };
  trainer: { user: { firstName: string; lastName: string } };
};

export default function AdminAttendancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Row[] }>("/attendance?pageSize=50")
      .then((res) => setRows(res.data.data))
      .catch(() => toast.error("Unable to load attendance"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Immutable session logs with trainer + client verification states.</p>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Recent logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Trainer status</TableHead>
                  <TableHead>Client status</TableHead>
                  <TableHead>Done</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.sessionDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {r.client.user.firstName} {r.client.user.lastName}
                    </TableCell>
                    <TableCell>
                      {r.trainer.user.firstName} {r.trainer.user.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.trainerStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.clientStatus === "PRESENT" ? "success" : "default"}>{r.clientStatus}</Badge>
                    </TableCell>
                    <TableCell>{r.sessionCompleted ? "Yes" : "No"}</TableCell>
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
