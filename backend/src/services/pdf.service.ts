import puppeteer from "puppeteer";
import type { PrismaClient } from "@prisma/client";

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function buildClientReportHtml(prisma: PrismaClient, clientId: string) {
  const client = await prisma.profileClient.findUnique({
    where: { id: clientId },
    include: {
      user: true,
      trainer: { include: { user: true } },
      measurements: { orderBy: { recordedAt: "desc" }, take: 12 },
      attendanceRecords: { orderBy: { sessionDate: "desc" }, take: 60 },
      workoutWeeks: {
        orderBy: { weekNumber: "desc" },
        take: 24,
        include: {
          days: {
            orderBy: { sortOrder: "asc" },
            include: { exercises: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
      dietWeeks: {
        orderBy: { weekNumber: "desc" },
        take: 24,
        include: {
          days: {
            orderBy: { sortOrder: "asc" },
            include: { meals: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
      progressEntries: { orderBy: { createdAt: "desc" }, take: 24 },
      progressPhotos: { orderBy: { createdAt: "desc" }, take: 24 },
    },
  });

  if (!client) throw new Error("Client not found");

  const workoutWeeksAsc = [...client.workoutWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const dietWeeksAsc = [...client.dietWeeks].sort((a, b) => a.weekNumber - b.weekNumber);

  const attendanceSummary = client.attendanceRecords.reduce(
    (acc, r) => {
      if (r.sessionCompleted) acc.completed += 1;
      if (r.clientStatus === "ABSENT") acc.clientAbsent += 1;
      if (r.trainerStatus === "ABSENT") acc.trainerAbsent += 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, completed: 0, clientAbsent: 0, trainerAbsent: 0 },
  );

  const rowsMeasurements = client.measurements
    .map(
      (m) => `<tr>
        <td>${m.recordedAt.toISOString().slice(0, 10)}</td>
        <td>${m.weight ?? ""}</td>
        <td>${m.bodyFat ?? ""}</td>
        <td>${m.waist ?? ""}</td>
      </tr>`,
    )
    .join("");

  const workoutBlocks = workoutWeeksAsc
    .map((w) => {
      const days = w.days
        .map((d) => {
          const ex = d.exercises
            .map(
              (e) =>
                `<li>${escapeHtml(e.name)} — sets ${e.sets ?? "-"}, reps ${escapeHtml(e.reps ?? "-")}, weight ${escapeHtml(e.weight ?? "-")}</li>`,
            )
            .join("");
          return `<div style="margin-bottom:8px"><strong>${escapeHtml(d.label)}</strong><ul>${ex}</ul></div>`;
        })
        .join("");
      return `<section style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #eee;padding:12px;border-radius:8px"><h3>Week ${w.weekNumber}</h3>${days}</section>`;
    })
    .join("");

  const dietBlocks = dietWeeksAsc
    .map((w) => {
      const days = w.days
        .map((d) => {
          const meals = d.meals
            .map(
              (m) =>
                `<li>${escapeHtml(m.foodName)} (${escapeHtml(m.quantity ?? "")}) — ${m.calories} kcal, P ${m.protein} / C ${m.carbs} / F ${m.fat}</li>`,
            )
            .join("");
          return `<div style="margin-bottom:8px"><strong>${escapeHtml(d.label)}</strong><ul>${meals}</ul></div>`;
        })
        .join("");
      return `<section style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #eee;padding:12px;border-radius:8px"><h3>Diet Week ${w.weekNumber}</h3>${days}</section>`;
    })
    .join("");

  const progressNotes = client.progressEntries
    .map(
      (p) =>
        `<div style="margin-bottom:10px;padding:10px;background:#fafafa;border-radius:6px"><div><strong>${p.weekStartDate?.toISOString().slice(0, 10) ?? "Week " + (p.weekNumber ?? "")}</strong></div><div>${escapeHtml(p.trainerComments ?? "")}</div><div>Recovery: ${escapeHtml(p.recovery ?? "")} · Energy: ${escapeHtml(p.energyLevel ?? "")}</div></div>`,
    )
    .join("");

  const photoRow = client.progressPhotos
    .map(
      (ph) =>
        `<div style="display:inline-block;margin:6px;text-align:center;width:140px"><img src="${escapeHtml(ph.url)}" style="width:140px;height:140px;object-fit:cover;border-radius:8px"/><div style="font-size:10px">${ph.type}</div></div>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Transformation Report</title>
  <style>
    body{font-family:Inter,system-ui,sans-serif;color:#111;padding:32px}
    h1{font-size:28px;margin:0 0 8px}
    h2{font-size:18px;margin-top:24px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ddd;padding:6px;text-align:left}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .card{border:1px solid #eee;border-radius:12px;padding:14px}
  </style></head><body>
  <h1>Gym Transformation Report</h1>
  <p style="color:#555">Generated ${new Date().toISOString().slice(0, 10)}</p>
  <div class="grid">
    <div class="card">
      <h2>Client</h2>
      <div><strong>${escapeHtml(client.user.firstName)} ${escapeHtml(client.user.lastName)}</strong></div>
      <div>Email: ${escapeHtml(client.user.email)}</div>
      <div>Phone: ${escapeHtml(client.user.phone ?? "")}</div>
      <div>Age: ${client.age ?? ""} · Gender: ${client.gender ?? ""}</div>
      <div>Goal: ${escapeHtml(client.goal ?? "")}</div>
      <div>Medical: ${escapeHtml(client.medicalNotes ?? "")}</div>
    </div>
    <div class="card">
      <h2>Membership</h2>
      <div>Trainer: ${escapeHtml(client.trainer.user.firstName)} ${escapeHtml(client.trainer.user.lastName)}</div>
      <div>Start: ${client.membershipStart?.toISOString().slice(0, 10) ?? ""}</div>
      <div>End: ${client.membershipEnd?.toISOString().slice(0, 10) ?? ""}</div>
      <div>Sessions: ${client.sessionsCompleted} / ${client.totalSessions} completed</div>
    </div>
  </div>
  <h2>Attendance summary</h2>
  <p>Records: ${attendanceSummary.total} · Completed sessions: ${attendanceSummary.completed} · Client absences: ${attendanceSummary.clientAbsent} · Trainer absences: ${attendanceSummary.trainerAbsent}</p>
  <h2>Measurements (recent)</h2>
  <table><thead><tr><th>Date</th><th>Weight</th><th>Body fat %</th><th>Waist</th></tr></thead><tbody>${rowsMeasurements}</tbody></table>
  <h2>Workout history</h2>
  ${workoutBlocks}
  <h2>Diet history</h2>
  ${dietBlocks}
  <h2>Progress notes</h2>
  ${progressNotes}
  <h2>Progress photos</h2>
  <div>${photoRow}</div>
  </body></html>`;
}

export async function renderPdfFromHtml(html: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return pdf;
  } finally {
    await browser.close();
  }
}
