import puppeteer from "puppeteer";
import { formatDateIST } from "../lib/datetime-format.js";
function escapeHtml(s) {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
/** Bodyweight trajectory line chart (matches Progress tab). */
function buildWeightTrajectoryChart(measurements) {
    const points = measurements
        .filter((m) => m.weight != null && m.weight > 0)
        .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
    if (points.length === 0) {
        return '<p style="color:#666;font-size:13px;margin:0">Log body weight to show the trajectory chart.</p>';
    }
    const width = 680;
    const height = 280;
    const pad = { top: 28, right: 28, bottom: 52, left: 56 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const weights = points.map((p) => p.weight);
    let yMin = Math.min(...weights);
    let yMax = Math.max(...weights);
    if (yMin === yMax) {
        yMin -= 5;
        yMax += 5;
    }
    else {
        const span = yMax - yMin;
        yMin -= span * 0.08;
        yMax += span * 0.08;
    }
    const xAt = (i) => pad.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
    const yAt = (w) => pad.top + plotH - ((w - yMin) / (yMax - yMin)) * plotH;
    const linePath = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.weight).toFixed(1)}`)
        .join(" ");
    const dots = points
        .map((p, i) => `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(p.weight).toFixed(1)}" r="4" fill="#2563eb" stroke="#fff" stroke-width="1.5"/>`)
        .join("");
    const yTicks = 5;
    const yGrid = Array.from({ length: yTicks }, (_, i) => {
        const v = yMin + ((yMax - yMin) * i) / (yTicks - 1);
        const y = yAt(v);
        return `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${width - pad.right}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${pad.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#6b7280">${v.toFixed(1)}</text>`;
    }).join("");
    const xLabels = points
        .map((p, i) => {
        const label = formatDateIST(p.recordedAt);
        const every = points.length <= 8 ? 1 : Math.ceil(points.length / 8);
        if (i % every !== 0 && i !== points.length - 1)
            return "";
        return `<text x="${xAt(i).toFixed(1)}" y="${height - 14}" text-anchor="middle" font-size="9" fill="#6b7280">${label}</text>`;
    })
        .join("");
    const areaPath = `${linePath} L ${xAt(points.length - 1).toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`;
    return `<div style="page-break-inside:avoid;margin-bottom:8px">
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="auto" role="img" aria-label="Bodyweight trajectory">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#fafafa" rx="12"/>
      ${yGrid}
      <path d="${areaPath}" fill="rgba(37,99,235,0.08)"/>
      <path d="${linePath}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
      ${xLabels}
      <text x="${pad.left}" y="16" font-size="11" font-weight="600" fill="#111827">Weight (kg)</text>
    </svg>
  </div>`;
}
export async function buildClientReportHtml(prisma, clientId) {
    const client = await prisma.profileClient.findUnique({
        where: { id: clientId },
        include: {
            user: true,
            trainer: { include: { user: true } },
            measurements: { orderBy: { recordedAt: "desc" } },
            attendanceRecords: { orderBy: { sessionDate: "desc" } },
            workoutWeeks: {
                orderBy: { weekNumber: "asc" },
                include: {
                    days: {
                        orderBy: { sortOrder: "asc" },
                        include: { exercises: { orderBy: { sortOrder: "asc" } } },
                    },
                },
            },
            dietWeeks: {
                orderBy: { weekNumber: "asc" },
                include: {
                    days: {
                        orderBy: { sortOrder: "asc" },
                        include: { meals: { orderBy: { sortOrder: "asc" } } },
                    },
                },
            },
            progressEntries: { orderBy: { createdAt: "desc" } },
            progressPhotos: { orderBy: { createdAt: "desc" } },
        },
    });
    if (!client)
        throw new Error("Client not found");
    const sessionsRemaining = Math.max(client.totalSessions - client.sessionsCompleted, 0);
    const attendanceSummary = client.attendanceRecords.reduce((acc, r) => {
        if (r.sessionCompleted)
            acc.completed += 1;
        if (r.sessionCharged)
            acc.charged += 1;
        if (r.clientStatus === "ABSENT")
            acc.clientAbsent += 1;
        if (r.trainerStatus === "ABSENT")
            acc.trainerAbsent += 1;
        acc.total += 1;
        return acc;
    }, { total: 0, completed: 0, charged: 0, clientAbsent: 0, trainerAbsent: 0 });
    const rowsMeasurements = client.measurements
        .map((m) => `<tr>
        <td>${formatDateIST(m.recordedAt)}</td>
        <td>${m.weight ?? ""}</td>
        <td>${m.bodyFat ?? ""}</td>
        <td>${m.waist ?? ""}</td>
      </tr>`)
        .join("");
    const workoutBlocks = client.workoutWeeks
        .map((w) => {
        const days = w.days
            .map((d) => {
            const ex = d.exercises
                .map((e) => `<li>${escapeHtml(e.name)} — sets ${e.sets ?? "-"}, reps ${escapeHtml(e.reps ?? "-")}, weight ${escapeHtml(e.weight ?? "-")}</li>`)
                .join("");
            return `<div style="margin-bottom:8px"><strong>${escapeHtml(d.label)}</strong><ul>${ex}</ul></div>`;
        })
            .join("");
        return `<section style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #eee;padding:12px;border-radius:8px"><h3>Week ${w.weekNumber}</h3>${days}</section>`;
    })
        .join("");
    const dietBlocks = client.dietWeeks
        .map((w) => {
        const days = w.days
            .map((d) => {
            const meals = d.meals
                .map((m) => `<li>${escapeHtml(m.foodName)} (${escapeHtml(m.quantity ?? "")}) — ${m.calories} kcal, P ${m.protein} / C ${m.carbs} / F ${m.fat}</li>`)
                .join("");
            return `<div style="margin-bottom:8px"><strong>${escapeHtml(d.label)}</strong><ul>${meals}</ul></div>`;
        })
            .join("");
        return `<section style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #eee;padding:12px;border-radius:8px"><h3>Diet Week ${w.weekNumber}</h3>${days}</section>`;
    })
        .join("");
    const progressNotes = client.progressEntries
        .map((p) => `<div style="margin-bottom:10px;padding:10px;background:#fafafa;border-radius:6px"><div><strong>${p.weekStartDate ? formatDateIST(p.weekStartDate) : "Week " + (p.weekNumber ?? "")}</strong></div><div>${escapeHtml(p.trainerComments ?? "")}</div><div>Recovery: ${escapeHtml(p.recovery ?? "")} · Energy: ${escapeHtml(p.energyLevel ?? "")}</div></div>`)
        .join("");
    const photoRow = client.progressPhotos
        .map((ph) => `<div style="display:inline-block;margin:6px;text-align:center;width:140px"><img src="${escapeHtml(ph.url)}" style="width:140px;height:140px;object-fit:cover;border-radius:8px"/><div style="font-size:10px">${ph.type}</div></div>`)
        .join("");
    const attendanceRows = client.attendanceRecords
        .map((r) => `<tr>
        <td>${formatDateIST(r.sessionDate)}</td>
        <td>${r.trainerStatus}</td>
        <td>${r.clientStatus}</td>
        <td>${r.sessionCompleted ? "Yes" : "No"}</td>
        <td>${r.sessionCharged ? "Yes" : "No"}</td>
      </tr>`)
        .join("");
    const weightChart = buildWeightTrajectoryChart(client.measurements);
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
  <p style="color:#555">Generated ${formatDateIST(new Date())}</p>
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
      <div>Start: ${client.membershipStart ? formatDateIST(client.membershipStart) : ""}</div>
      <div>End: ${client.membershipEnd ? formatDateIST(client.membershipEnd) : ""}</div>
      <div>Completed: ${client.sessionsCompleted} / ${client.totalSessions}</div>
      <div>Remaining: ${sessionsRemaining}</div>
    </div>
  </div>
  <h2>Attendance summary</h2>
  <p>Records: ${attendanceSummary.total} · Completed sessions: ${attendanceSummary.completed} · Charged: ${attendanceSummary.charged} · Client absences: ${attendanceSummary.clientAbsent} · Trainer absences: ${attendanceSummary.trainerAbsent}</p>
  <h2>Attendance log</h2>
  <table><thead><tr><th>Date</th><th>Trainer</th><th>Client</th><th>Completed</th><th>Charged</th></tr></thead><tbody>${attendanceRows}</tbody></table>
  <h2>Bodyweight trajectory</h2>
  ${weightChart}
  <h2>Measurements</h2>
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
export async function renderPdfFromHtml(html) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load" });
        const pdf = await page.pdf({ format: "A4", printBackground: true });
        return pdf;
    }
    finally {
        await browser.close();
    }
}
//# sourceMappingURL=pdf.service.js.map