/**
 * Transactional email via Resend.
 *
 * Requires RESEND_API_KEY env var.
 * All emails are sent from noreply@avidiatech.com (configure your Resend domain).
 *
 * Usage:
 *   import { sendEmail } from "@/lib/email";
 *   await sendEmail.trialStarted({ to: "user@example.com", name: "Alice", trialEndsAt: new Date() });
 */

import { Resend } from "resend";

const FROM = "AvidiaTech <noreply@avidiatech.com>";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Silently skip in environments where email is not configured
    throw new Error("RESEND_API_KEY is not set — email sending is disabled.");
  }
  return new Resend(key);
}

/** Format a Date as "Month Day, Year" */
function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Shared HTML wrapper */
function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AvidiaTech</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <!-- Header gradient bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#0ea5e9 100%);"></td>
          </tr>
          <!-- Logo -->
          <tr>
            <td style="padding:28px 32px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <!-- Neural Node mark (inline SVG — renders in Gmail, Apple Mail, Outlook 365) -->
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                      <defs>
                        <linearGradient id="eg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stop-color="#6366f1"/>
                          <stop offset="48%" stop-color="#8b5cf6"/>
                          <stop offset="100%" stop-color="#e879f9"/>
                        </linearGradient>
                      </defs>
                      <line x1="18" y1="7" x2="18" y2="29" stroke="url(#eg)" stroke-width="0.8" stroke-opacity="0.22"/>
                      <line x1="27.53" y1="12.5" x2="8.47" y2="23.5" stroke="url(#eg)" stroke-width="0.8" stroke-opacity="0.22"/>
                      <line x1="27.53" y1="23.5" x2="8.47" y2="12.5" stroke="url(#eg)" stroke-width="0.8" stroke-opacity="0.22"/>
                      <line x1="18" y1="7" x2="27.53" y2="12.5" stroke="url(#eg)" stroke-width="1" stroke-opacity="0.5" stroke-linecap="round"/>
                      <line x1="27.53" y1="12.5" x2="27.53" y2="23.5" stroke="url(#eg)" stroke-width="1" stroke-opacity="0.5" stroke-linecap="round"/>
                      <line x1="27.53" y1="23.5" x2="18" y2="29" stroke="url(#eg)" stroke-width="1" stroke-opacity="0.5" stroke-linecap="round"/>
                      <line x1="18" y1="29" x2="8.47" y2="23.5" stroke="url(#eg)" stroke-width="1" stroke-opacity="0.5" stroke-linecap="round"/>
                      <line x1="8.47" y1="23.5" x2="8.47" y2="12.5" stroke="url(#eg)" stroke-width="1" stroke-opacity="0.5" stroke-linecap="round"/>
                      <line x1="8.47" y1="12.5" x2="18" y2="7" stroke="url(#eg)" stroke-width="1" stroke-opacity="0.5" stroke-linecap="round"/>
                      <line x1="18" y1="18" x2="18" y2="7" stroke="url(#eg)" stroke-width="1.2" stroke-opacity="0.78" stroke-linecap="round"/>
                      <line x1="18" y1="18" x2="27.53" y2="12.5" stroke="url(#eg)" stroke-width="1.2" stroke-opacity="0.78" stroke-linecap="round"/>
                      <line x1="18" y1="18" x2="27.53" y2="23.5" stroke="url(#eg)" stroke-width="1.2" stroke-opacity="0.78" stroke-linecap="round"/>
                      <line x1="18" y1="18" x2="18" y2="29" stroke="url(#eg)" stroke-width="1.2" stroke-opacity="0.78" stroke-linecap="round"/>
                      <line x1="18" y1="18" x2="8.47" y2="23.5" stroke="url(#eg)" stroke-width="1.2" stroke-opacity="0.78" stroke-linecap="round"/>
                      <line x1="18" y1="18" x2="8.47" y2="12.5" stroke="url(#eg)" stroke-width="1.2" stroke-opacity="0.78" stroke-linecap="round"/>
                      <circle cx="18" cy="7" r="2.34" fill="url(#eg)"/>
                      <circle cx="27.53" cy="12.5" r="2.34" fill="url(#eg)"/>
                      <circle cx="27.53" cy="23.5" r="2.34" fill="url(#eg)"/>
                      <circle cx="18" cy="29" r="2.34" fill="url(#eg)"/>
                      <circle cx="8.47" cy="23.5" r="2.34" fill="url(#eg)"/>
                      <circle cx="8.47" cy="12.5" r="2.34" fill="url(#eg)"/>
                      <circle cx="18" cy="18" r="3.17" fill="url(#eg)"/>
                    </svg>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="display:block;font-size:16px;font-weight:700;color:#1e293b;letter-spacing:-0.4px;line-height:1.1;">AvidiaTech</span>
                    <span style="display:block;font-size:10px;font-weight:500;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-top:1px;">Product Data OS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 32px 32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You received this email because you have an account with AvidiaTech.
                &nbsp;·&nbsp;
                <a href="https://avidiatech.com/legal/privacy" style="color:#6366f1;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="https://avidiatech.com/legal/terms" style="color:#6366f1;text-decoration:none;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Primary CTA button */
function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">${label}</a>`;
}

// ---------------------------------------------------------------------------
// Email senders
// ---------------------------------------------------------------------------

export const sendEmail = {
  /**
   * Welcome / trial started
   */
  async trialStarted(opts: { to: string; name: string; trialEndsAt: Date | string }) {
    const resend = getResend();
    const endDate = fmtDate(opts.trialEndsAt);
    const body = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">Welcome to AvidiaTech, ${opts.name}!</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        Your 14-day free trial is now active. You have access to all Starter-tier features — extract product data,
        generate AI descriptions, translate listings, and more.
      </p>
      <p style="margin:0;font-size:15px;color:#475569;"><strong>Trial ends:</strong> ${endDate}</p>
      ${btn("Go to Dashboard", "https://avidiatech.com/dashboard")}
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
        No credit card needed during your trial. If you'd like to continue after ${endDate},
        just pick a plan from your billing settings.
      </p>`;
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: "Your AvidiaTech trial has started 🚀",
      html: layout(body),
    });
  },

  /**
   * Trial expiring soon (send 3 days before end)
   */
  async trialExpiringSoon(opts: { to: string; name: string; trialEndsAt: Date | string; daysLeft: number }) {
    const resend = getResend();
    const endDate = fmtDate(opts.trialEndsAt);
    const body = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">Your trial ends in ${opts.daysLeft} day${opts.daysLeft === 1 ? "" : "s"}</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        Hi ${opts.name}, your AvidiaTech trial expires on <strong>${endDate}</strong>.
        To keep your data and continue using all features, choose a plan before then.
      </p>
      ${btn("Choose a Plan", "https://avidiatech.com/dashboard/pricing")}
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
        Questions? Reply to this email or contact <a href="mailto:support@avidiatech.com" style="color:#6366f1;">support@avidiatech.com</a>.
      </p>`;
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Your AvidiaTech trial ends in ${opts.daysLeft} day${opts.daysLeft === 1 ? "" : "s"}`,
      html: layout(body),
    });
  },

  /**
   * Trial expired
   */
  async trialExpired(opts: { to: string; name: string }) {
    const resend = getResend();
    const body = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">Your trial has ended</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        Hi ${opts.name}, your AvidiaTech free trial has expired. Your data is safe and will be retained for 90 days.
        Subscribe to a plan to restore full access.
      </p>
      ${btn("View Plans", "https://avidiatech.com/dashboard/pricing")}
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
        Need help deciding? <a href="mailto:support@avidiatech.com" style="color:#6366f1;">Chat with us</a>.
      </p>`;
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: "Your AvidiaTech trial has expired",
      html: layout(body),
    });
  },

  /**
   * Payment succeeded
   */
  async paymentSucceeded(opts: { to: string; name: string; amount: string; plan: string; periodEnd: Date | string }) {
    const resend = getResend();
    const endDate = fmtDate(opts.periodEnd);
    const body = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">Payment confirmed</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        Hi ${opts.name}, your payment of <strong>${opts.amount}</strong> for the <strong>${opts.plan}</strong> plan
        has been successfully processed. Your subscription is active until <strong>${endDate}</strong>.
      </p>
      ${btn("View Dashboard", "https://avidiatech.com/dashboard")}
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
        A receipt has been sent to your billing email by Stripe.
      </p>`;
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Payment confirmed — AvidiaTech ${opts.plan} Plan`,
      html: layout(body),
    });
  },

  /**
   * Payment failed
   */
  async paymentFailed(opts: { to: string; name: string; amount: string; nextAttempt?: string }) {
    const resend = getResend();
    const retryNote = opts.nextAttempt
      ? `We will automatically retry on <strong>${opts.nextAttempt}</strong>.`
      : "Please update your payment method to avoid service interruption.";
    const body = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#dc2626;">Payment failed</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        Hi ${opts.name}, we were unable to process your payment of <strong>${opts.amount}</strong>. ${retryNote}
      </p>
      ${btn("Update Payment Method", "https://avidiatech.com/dashboard/pricing")}
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
        If you need help, contact <a href="mailto:support@avidiatech.com" style="color:#6366f1;">support@avidiatech.com</a>.
      </p>`;
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: "Action required: payment failed for AvidiaTech",
      html: layout(body),
    });
  },

  /**
   * Payment recovered after previous failure
   */
  async paymentRecovered(opts: { to: string; name: string; plan: string }) {
    const resend = getResend();
    const body = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#16a34a;">Payment recovered</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        Great news, ${opts.name}! Your payment has been successfully processed and your <strong>${opts.plan}</strong> subscription is fully active again.
      </p>
      ${btn("Go to Dashboard", "https://avidiatech.com/dashboard")}`;
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: "Payment recovered — AvidiaTech subscription restored",
      html: layout(body),
    });
  },

  /**
   * Subscription cancelled
   */
  async subscriptionCancelled(opts: { to: string; name: string; plan: string; accessUntil: Date | string }) {
    const resend = getResend();
    const until = fmtDate(opts.accessUntil);
    const body = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">Subscription cancelled</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        Hi ${opts.name}, your <strong>${opts.plan}</strong> subscription has been cancelled.
        You will retain full access to your account until <strong>${until}</strong>, after which it will revert to read-only mode.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;">
        Changed your mind? You can resubscribe any time before ${until} without losing any data.
      </p>
      ${btn("Resubscribe", "https://avidiatech.com/dashboard/pricing")}`;
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: "Your AvidiaTech subscription has been cancelled",
      html: layout(body),
    });
  },

  /**
   * Plan upgraded or downgraded
   */
  async planChanged(opts: { to: string; name: string; fromPlan: string; toPlan: string; effectiveDate: Date | string }) {
    const resend = getResend();
    const effDate = fmtDate(opts.effectiveDate);
    const isUpgrade = ["growth", "pro"].includes(opts.toPlan.toLowerCase());
    const body = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">Plan ${isUpgrade ? "upgraded" : "changed"}</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        Hi ${opts.name}, your subscription has been changed from <strong>${opts.fromPlan}</strong> to <strong>${opts.toPlan}</strong>,
        effective <strong>${effDate}</strong>.
      </p>
      ${btn("View Dashboard", "https://avidiatech.com/dashboard")}`;
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Your AvidiaTech plan has been updated to ${opts.toPlan}`,
      html: layout(body),
    });
  },
};
