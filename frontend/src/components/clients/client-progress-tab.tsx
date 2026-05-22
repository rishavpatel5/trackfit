"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { api } from "@/lib/api";
import { cachedApiGet } from "@/lib/api-cache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatDateIST, formatDateTimeIST, parseApiDate } from "@/lib/datetime";

export type MeasurementRow = {
  id: string;
  recordedAt: string;
  weight: number | null;
  height: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  biceps: number | null;
  forearms: number | null;
  thigh: number | null;
  calves: number | null;
  bodyFat: number | null;
  bmi: number | null;
};

type ProgressPhoto = {
  id: string;
  type: "BEFORE" | "AFTER" | "WEEKLY";
  url: string;
  weekNumber: number | null;
  createdAt: string;
};

type ProgressEntry = {
  id: string;
  weekNumber: number | null;
  weekStartDate: string | null;
  createdAt: string;
  trainerComments: string | null;
  recovery: string | null;
  energyLevel: string | null;
  performanceNotes: string | null;
  strengthNotes: string | null;
};

function latestOfType(photos: ProgressPhoto[], t: ProgressPhoto["type"]) {
  return [...photos.filter((p) => p.type === t)].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function weekLabelMonday(dateIso: string) {
  const d = parseApiDate(dateIso);
  const day = d.getUTCDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diffToMon);
  return formatDateIST(mon);
}

function groupingKeyMonday(dateIso: string) {
  const d = parseApiDate(dateIso);
  const day = d.getUTCDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diffToMon);
  return mon.toISOString().slice(0, 10);
}

function uploadErrorToast(err: unknown, fallback: string) {
  const res = err && typeof err === "object" && "response" in err ? (err as { response?: { status?: number; data?: { error?: string } } }).response : undefined;
  if (res?.status === 503 && res.data?.error?.includes("Cloudinary")) {
    toast.error(
      "Upload blocked: API does not see Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env, then restart the API.",
    );
    return;
  }
  toast.error(res?.data?.error ?? fallback);
}

export function ClientProgressTab({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    Promise.all([
      cachedApiGet<{ data: MeasurementRow[] }>(`/measurements/clients/${clientId}?pageSize=200`, 30_000),
      cachedApiGet<ProgressPhoto[]>(`/progress/clients/${clientId}/photos`, 30_000),
      cachedApiGet<{ data: ProgressEntry[] }>(`/progress/clients/${clientId}/entries?pageSize=100`, 30_000),
    ])
      .then(([measurementsRes, photosRes, entriesRes]) => {
        setMeasurements(measurementsRes.data);
        setPhotos(photosRes);
        setEntries(entriesRes.data);
      })
      .catch(() => toast.error("Unable to load progress data"));
  }, [clientId, tick]);

  const sortedMeasurements = useMemo(
    () => [...measurements].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()),
    [measurements],
  );

  const baseline = sortedMeasurements[0];
  const followups = sortedMeasurements.slice(1);

  const groupedByWeek = useMemo(() => {
    const map = new Map<
      string,
      { label: string; measurements: MeasurementRow[]; weeklyPhotos: ProgressPhoto[]; entries: ProgressEntry[] }
    >();
    for (const m of followups) {
      const key = groupingKeyMonday(m.recordedAt);
      if (!map.has(key)) map.set(key, { label: weekLabelMonday(m.recordedAt), measurements: [], weeklyPhotos: [], entries: [] });
      map.get(key)!.measurements.push(m);
    }
    for (const p of photos.filter((x) => x.type === "WEEKLY")) {
      const key = groupingKeyMonday(p.createdAt);
      if (!map.has(key)) map.set(key, { label: weekLabelMonday(p.createdAt), measurements: [], weeklyPhotos: [], entries: [] });
      map.get(key)!.weeklyPhotos.push(p);
    }
    for (const e of entries) {
      const anchor = e.weekStartDate ?? e.createdAt;
      const key = groupingKeyMonday(anchor);
      if (!map.has(key)) map.set(key, { label: weekLabelMonday(anchor), measurements: [], weeklyPhotos: [], entries: [] });
      map.get(key)!.entries.push(e);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [followups, photos, entries]);

  const heroBefore = latestOfType(photos, "BEFORE");
  const heroAfter = latestOfType(photos, "AFTER");

  const chartData = [...sortedMeasurements]
    .filter((m) => m.weight != null && m.weight > 0)
    .map((m) => ({
      label: formatDateIST(m.recordedAt),
      weight: m.weight ?? 0,
    }));

  return (
    <div className="space-y-8">
      <Card className="border-border/70 overflow-hidden">
        <CardHeader>
          <CardTitle>Transformation gallery</CardTitle>
          <CardDescription>Featured before · after checkpoints (latest uploads).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <PhotoHero
              title="Before"
              url={heroBefore?.url}
              emptyText="Trainer can upload baseline imagery once Cloudinary URL or hosted link is captured."
              canEdit={canEdit}
              clientId={clientId}
              type="BEFORE"
              onUploaded={refresh}
            />
            <PhotoHero
              title="After"
              url={heroAfter?.url}
              emptyText="Progress reveal — attach most recent physique capture."
              canEdit={canEdit}
              clientId={clientId}
              type="AFTER"
              onUploaded={refresh}
            />
          </div>
          {canEdit ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Upload pipes through `/upload/image` when Cloudinary is configured; otherwise paste a direct HTTPS asset URL after hosting manually.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-primary/40 bg-muted/15">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Baseline assessment</CardTitle>
            <CardDescription>
              Captures collected on onboarding day — anchors every downstream comparison.&nbsp;
              {baseline ? <Badge variant="success">{formatDateIST(baseline.recordedAt)}</Badge> : null}
            </CardDescription>
          </div>
          {canEdit ? <LogMeasurementDialog clientId={clientId} onLogged={refresh} /> : null}
        </CardHeader>
        <CardContent>
          {baseline ? (
            <MeasurementGridView data={baseline} />
          ) : (
            <p className="text-sm text-muted-foreground">Record the first intake session to populate baseline metrics.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 lg:col-span-2">
        <CardHeader>
          <CardTitle>Bodyweight trajectory</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Log body weight to ignite trend forecasting.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Weekly transformation checkpoints</CardTitle>
          <CardDescription>Measurements, weekly captures, and coach commentary grouped per training week cycle.</CardDescription>
        </CardHeader>
        <CardContent>
          {!baseline ? (
            <p className="text-sm text-muted-foreground">Define baseline first.</p>
          ) : groupedByWeek.length === 0 ? (
            <p className="text-sm text-muted-foreground">Future check-ins populate here chronologically.</p>
          ) : (
            <Accordion type="multiple" className="rounded-xl border border-border">
              {groupedByWeek.map(([key, grp]) => (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger className="px-4">Week commencing {grp.label}</AccordionTrigger>
                  <AccordionContent className="border-t border-border bg-muted/10 px-4 py-6">
                    {grp.measurements.map((m) => (
                      <div key={m.id} className="mb-6 rounded-lg border border-border bg-card p-4 last:mb-0">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Checkpoint · {formatDateTimeIST(m.recordedAt)}
                        </p>
                        <MeasurementGridView data={m} dense />
                      </div>
                    ))}
                    {grp.weeklyPhotos.length > 0 ? (
                      <div className="mb-6 flex flex-wrap gap-4">
                        {grp.weeklyPhotos.map((ph) => (
                          <WeeklyThumb key={ph.id} url={ph.url} label={`Weekly · optional W${ph.weekNumber ?? "-"}`} />
                        ))}
                      </div>
                    ) : null}
                    {grp.entries.map((en) => (
                      <CoachNote key={en.id} entry={en} />
                    ))}
                    {grp.measurements.length === 0 && grp.weeklyPhotos.length === 0 && grp.entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Awaiting uploads for this week.</p>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {canEdit ? (
        <>
          <CoachWeeklyRecapCard clientId={clientId} onSaved={refresh} />
          <WeeklyPhotoUploader clientId={clientId} onDone={refresh} />
        </>
      ) : null}
    </div>
  );
}

function CoachWeeklyRecapCard({ clientId, onSaved }: { clientId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [weekStr, setWeekStr] = useState("");
  const [comments, setComments] = useState("");
  const [recovery, setRecovery] = useState("");
  const [energy, setEnergy] = useState("");
  const [performance, setPerformance] = useState("");
  const [strength, setStrength] = useState("");

  async function publish() {
    try {
      await api.post(`/progress/clients/${clientId}/entries`, {
        ...(weekStr.trim() === "" ? {} : { weekNumber: Number(weekStr) }),
        trainerComments: comments || undefined,
        recovery: recovery || undefined,
        energyLevel: energy || undefined,
        performanceNotes: performance || undefined,
        strengthNotes: strength || undefined,
      });
      toast.success("Weekly recap published");
      setOpen(false);
      setWeekStr("");
      setComments("");
      setRecovery("");
      setEnergy("");
      setPerformance("");
      setStrength("");
      onSaved();
    } catch {
      toast.error("Unable to save recap");
    }
  }

  return (
    <Card className="border-border bg-card/70">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base">Weekly coach recap</CardTitle>
          <CardDescription>Surface qualitative signals alongside biometric checkpoints.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Log recap
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Transformation notes</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Week index (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1"
                  placeholder="e.g., 6"
                  value={weekStr}
                  onChange={(e) => setWeekStr(e.target.value)}
                />
              </div>
              <div>
                <Label>Coach comments</Label>
                <Textarea className="mt-1" value={comments} onChange={(e) => setComments(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Recovery</Label>
                  <Input className="mt-1" value={recovery} onChange={(e) => setRecovery(e.target.value)} />
                </div>
                <div>
                  <Label>Energy</Label>
                  <Input className="mt-1" value={energy} onChange={(e) => setEnergy(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Performance narrative</Label>
                <Textarea className="mt-1" value={performance} onChange={(e) => setPerformance(e.target.value)} />
              </div>
              <div>
                <Label>Strength block</Label>
                <Input className="mt-1" value={strength} onChange={(e) => setStrength(e.target.value)} />
              </div>
              <Button type="button" className="w-full" onClick={publish}>
                Publish recap
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
    </Card>
  );
}

function PhotoHero({
  title,
  url,
  emptyText,
  canEdit,
  clientId,
  type,
  onUploaded,
}: {
  title: string;
  url?: string;
  emptyText: string;
  canEdit: boolean;
  clientId: string;
  type: "BEFORE" | "AFTER";
  onUploaded: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">{title}</p>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-muted/50">
        {url ? (
          <Image src={url} alt={title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{emptyText}</div>
        )}
      </div>
      {canEdit ? <AttachPhotoInputs clientId={clientId} type={type} onSaved={onUploaded} /> : null}
    </div>
  );
}

function WeeklyThumb({ url, label }: { url: string; label: string }) {
  return (
    <div className="relative h-44 w-32 overflow-hidden rounded-xl border border-border">
      <Image src={url} alt={label} fill className="object-cover" sizes="128px" />
      <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[10px] text-white">{label}</span>
    </div>
  );
}

function CoachNote({ entry }: { entry: ProgressEntry }) {
  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-4 last:mb-0">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">Coach note</p>
      {entry.trainerComments ? <p className="mt-2 text-sm">{entry.trainerComments}</p> : null}
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
        <span>Recovery: {entry.recovery ?? "—"}</span>
        <span>Energy: {entry.energyLevel ?? "—"}</span>
        <span className="md:col-span-2">Performance: {entry.performanceNotes ?? "—"}</span>
        <span className="md:col-span-2">Strength: {entry.strengthNotes ?? "—"}</span>
      </div>
    </div>
  );
}

function MeasurementGridView({ data, dense }: { data: MeasurementRow; dense?: boolean }) {
  const tiles: { label: string; val: string }[] = [
    { label: "Weight", val: fmt(data.weight, " kg") },
    { label: "Height", val: fmt(data.height, " cm") },
    { label: "Chest", val: fmt(data.chest, " cm") },
    { label: "Waist", val: fmt(data.waist, " cm") },
    { label: "Hips", val: fmt(data.hips, " cm") },
    { label: "Biceps", val: fmt(data.biceps, " cm") },
    { label: "Forearms", val: fmt(data.forearms, " cm") },
    { label: "Thigh", val: fmt(data.thigh, " cm") },
    { label: "Calves", val: fmt(data.calves, " cm") },
    { label: "Body fat %", val: fmtPct(data.bodyFat) },
    { label: "BMI", val: data.bmi != null ? String(data.bmi) : "—" },
  ];
  const gridCls = dense ? "grid gap-3 sm:grid-cols-2 md:grid-cols-4" : "grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6";
  return (
    <div className={gridCls}>
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{t.label}</p>
          <p className={`font-semibold ${dense ? "text-sm" : "text-lg"}`}>{t.val}</p>
        </div>
      ))}
    </div>
  );
}

function fmt(v: number | null, suffix = "") {
  if (v == null) return "—";
  return `${v}${suffix}`;
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${v}%`;
}

function AttachPhotoInputs({
  clientId,
  type,
  onSaved,
}: {
  clientId: string;
  type: "BEFORE" | "AFTER" | "WEEKLY";
  onSaved: () => void;
}) {
  const [url, setUrl] = useState("");
  async function attach() {
    if (!url.startsWith("https://")) {
      toast.error("Use HTTPS image URL");
      return;
    }
    try {
      await api.post(`/progress/clients/${clientId}/photos`, { type, url });
      toast.success("Photo recorded");
      setUrl("");
      onSaved();
    } catch {
      toast.error("Save failed — check trainer access.");
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    fd.append("folder", `gvtrainer/progress/${clientId}`);
    try {
      const res = await api.post<{ url: string }>("/upload/image", fd);
      await api.post(`/progress/clients/${clientId}/photos`, { type, url: res.data.url });
      toast.success("Photo uploaded");
      onSaved();
    } catch (err) {
      uploadErrorToast(err, "Upload failed — configure Cloudinary on the API or paste an image URL.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/20 p-3">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Paste https://..." value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
        <Button type="button" size="sm" variant="outline" onClick={attach}>
          Save URL
        </Button>
      </div>
      <Label className="text-xs text-muted-foreground">Upload file</Label>
      <Input type="file" accept="image/*" className="cursor-pointer text-sm" onChange={uploadFile} />
    </div>
  );
}

function WeeklyPhotoUploader({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const [wk, setWk] = useState(1);
  return (
    <Card className="border-dashed border-border">
      <CardHeader>
        <CardTitle className="text-base">Optional weekly physique</CardTitle>
        <CardDescription>Tag the training week index for chronological galleries.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Week #</Label>
          <Input type="number" min={1} className="mt-1 w-24" value={wk} onChange={(e) => setWk(Number(e.target.value))} />
        </div>
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label>Upload + attach as WEEKLY</Label>
          <Input
            type="file"
            accept="image/*"
            className="cursor-pointer text-sm"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.append("file", f);
              fd.append("folder", `gvtrainer/progress/${clientId}/weekly`);
              try {
                const res = await api.post<{ url: string }>("/upload/image", fd);
                await api.post(`/progress/clients/${clientId}/photos`, { type: "WEEKLY", weekNumber: wk, url: res.data.url });
                toast.success("Weekly capture saved");
                onDone();
              } catch (err) {
                uploadErrorToast(err, "Upload failed — paste URL variant still available below.");
              } finally {
                e.target.value = "";
              }
            }}
          />
        </div>
        <WeeklyPasteUrl clientId={clientId} weekNumber={wk} onSaved={onDone} />
      </CardContent>
    </Card>
  );
}

function WeeklyPasteUrl({
  clientId,
  weekNumber,
  onSaved,
}: {
  clientId: string;
  weekNumber: number;
  onSaved: () => void;
}) {
  const [u, setU] = useState("");
  async function save() {
    if (!u.startsWith("https://")) {
      toast.error("HTTPS URLs only.");
      return;
    }
    try {
      await api.post(`/progress/clients/${clientId}/photos`, { type: "WEEKLY", weekNumber, url: u });
      toast.success("Weekly photo captured");
      setU("");
      onSaved();
    } catch {
      toast.error("Failed");
    }
  }
  return (
    <div className="flex min-w-[220px] flex-1 gap-2">
      <Input placeholder="Weekly photo URL (https)" value={u} onChange={(e) => setU(e.target.value)} />
      <Button type="button" variant="outline" onClick={save}>
        Save weekly URL
      </Button>
    </div>
  );
}

function LogMeasurementDialog({ clientId, onLogged }: { clientId: string; onLogged: () => void }) {
  const blank = (): Record<string, string> => ({
    weight: "",
    height: "",
    chest: "",
    waist: "",
    hips: "",
    biceps: "",
    forearms: "",
    thigh: "",
    calves: "",
    bodyFat: "",
    bmi: "",
  });

  const [open, setOpen] = useState(false);
  const [v, setV] = useState(blank);

  async function save() {
    const num = (s: string) => (s === "" ? undefined : Number(s));
    try {
      await api.post(`/measurements/clients/${clientId}`, {
        weight: num(v.weight),
        height: num(v.height),
        chest: num(v.chest),
        waist: num(v.waist),
        hips: num(v.hips),
        biceps: num(v.biceps),
        forearms: num(v.forearms),
        thigh: num(v.thigh),
        calves: num(v.calves),
        bodyFat: num(v.bodyFat),
        bmi: num(v.bmi),
      });
      toast.success("Measurements saved");
      setOpen(false);
      setV(blank());
      onLogged();
    } catch {
      toast.error("Unable to save");
    }
  }

  const fld = (
    key: keyof typeof v,
    label: string,
  ) => (
    <div key={key}>
      <Label>{label}</Label>
      <Input className="mt-1" value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Log measurements</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>New measurement checkpoint</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 pb-14 sm:grid-cols-2">
          {fld("weight", "Weight (kg)")}
          {fld("height", "Height (cm)")}
          {fld("chest", "Chest (cm)")}
          {fld("waist", "Waist (cm)")}
          {fld("hips", "Hips (cm)")}
          {fld("biceps", "Biceps (cm)")}
          {fld("forearms", "Forearms (cm)")}
          {fld("thigh", "Thigh (cm)")}
          {fld("calves", "Calves (cm)")}
          {fld("bodyFat", "Body fat %")}
          {fld("bmi", "BMI (optional override)")}
        </div>
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" onClick={save}>
            Save checkpoint
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
