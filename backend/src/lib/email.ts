import type { Env } from "./env.js";

/**
 * Optional Resend integration (free tier). Keeps JWT auth unchanged — only outbound mail.
 */
export async function sendPasswordResetEmail(env: Env, to: string, rawToken: string): Promise<boolean> {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!key || !from) return false;

  const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/login`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your GVTrainer password",
      text: [
        "You requested a password reset.",
        "",
        `Open ${resetUrl} after you set a new password using your app’s reset screen (token below).`,
        "",
        `Reset token (expires in 1 hour): ${rawToken}`,
        "",
        "If you did not request this, ignore this email.",
      ].join("\n"),
    }),
  });

  return res.ok;
}
