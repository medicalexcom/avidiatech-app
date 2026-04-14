/**
 * Dynamic OG image — 1200 × 630 px
 * Served at https://app.avidiatech.com/og
 *
 * Supports optional query params:
 *   ?title=Custom+Page+Title
 *   ?subtitle=A+short+description
 *
 * Uses Next.js built-in ImageResponse (no extra package needed).
 */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title    = searchParams.get("title")    ?? "AvidiaTech";
  const subtitle = searchParams.get("subtitle") ?? "Product Data OS — Extract, Enrich & Automate at Scale";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background: "#0f172a",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient blobs */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-80px",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-60px",
            width: "420px",
            height: "420px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Top gradient bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #e879f9 100%)",
          }}
        />

        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            padding: "60px 72px",
            position: "relative",
          }}
        >
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Neural Node mark — SVG inline */}
            <svg width="48" height="48" viewBox="0 0 36 36" fill="none">
              <defs>
                <linearGradient id="og-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor="#6366f1" />
                  <stop offset="48%"  stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#e879f9" />
                </linearGradient>
                <radialGradient id="og-rg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="18" cy="18" r="17.5" fill="url(#og-rg)"/>
              {/* cross diagonals */}
              <line x1="18" y1="7"     x2="18"    y2="29"   stroke="url(#og-g)" strokeWidth="0.8"  strokeOpacity="0.22"/>
              <line x1="27.53" y1="12.5" x2="8.47" y2="23.5" stroke="url(#og-g)" strokeWidth="0.8"  strokeOpacity="0.22"/>
              <line x1="27.53" y1="23.5" x2="8.47" y2="12.5" stroke="url(#og-g)" strokeWidth="0.8"  strokeOpacity="0.22"/>
              {/* rim */}
              <line x1="18"    y1="7"    x2="27.53" y2="12.5" stroke="url(#og-g)" strokeWidth="1.0" strokeOpacity="0.5" strokeLinecap="round"/>
              <line x1="27.53" y1="12.5" x2="27.53" y2="23.5" stroke="url(#og-g)" strokeWidth="1.0" strokeOpacity="0.5" strokeLinecap="round"/>
              <line x1="27.53" y1="23.5" x2="18"    y2="29"   stroke="url(#og-g)" strokeWidth="1.0" strokeOpacity="0.5" strokeLinecap="round"/>
              <line x1="18"    y1="29"   x2="8.47"  y2="23.5" stroke="url(#og-g)" strokeWidth="1.0" strokeOpacity="0.5" strokeLinecap="round"/>
              <line x1="8.47"  y1="23.5" x2="8.47"  y2="12.5" stroke="url(#og-g)" strokeWidth="1.0" strokeOpacity="0.5" strokeLinecap="round"/>
              <line x1="8.47"  y1="12.5" x2="18"    y2="7"    stroke="url(#og-g)" strokeWidth="1.0" strokeOpacity="0.5" strokeLinecap="round"/>
              {/* spokes */}
              <line x1="18" y1="18" x2="18"    y2="7"    stroke="url(#og-g)" strokeWidth="1.2" strokeOpacity="0.78" strokeLinecap="round"/>
              <line x1="18" y1="18" x2="27.53" y2="12.5" stroke="url(#og-g)" strokeWidth="1.2" strokeOpacity="0.78" strokeLinecap="round"/>
              <line x1="18" y1="18" x2="27.53" y2="23.5" stroke="url(#og-g)" strokeWidth="1.2" strokeOpacity="0.78" strokeLinecap="round"/>
              <line x1="18" y1="18" x2="18"    y2="29"   stroke="url(#og-g)" strokeWidth="1.2" strokeOpacity="0.78" strokeLinecap="round"/>
              <line x1="18" y1="18" x2="8.47"  y2="23.5" stroke="url(#og-g)" strokeWidth="1.2" strokeOpacity="0.78" strokeLinecap="round"/>
              <line x1="18" y1="18" x2="8.47"  y2="12.5" stroke="url(#og-g)" strokeWidth="1.2" strokeOpacity="0.78" strokeLinecap="round"/>
              {/* nodes */}
              <circle cx="18"    cy="7"    r="2.34" fill="url(#og-g)"/>
              <circle cx="27.53" cy="12.5" r="2.34" fill="url(#og-g)"/>
              <circle cx="27.53" cy="23.5" r="2.34" fill="url(#og-g)"/>
              <circle cx="18"    cy="29"   r="2.34" fill="url(#og-g)"/>
              <circle cx="8.47"  cy="23.5" r="2.34" fill="url(#og-g)"/>
              <circle cx="8.47"  cy="12.5" r="2.34" fill="url(#og-g)"/>
              <circle cx="18"    cy="18"   r="3.17" fill="url(#og-g)"/>
            </svg>
            <span style={{ fontSize: "22px", fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.5px" }}>
              AvidiaTech
            </span>
          </div>

          {/* Main text */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                fontSize: title.length > 30 ? "52px" : "64px",
                fontWeight: 800,
                color: "#f1f5f9",
                lineHeight: 1.1,
                letterSpacing: "-1.5px",
                maxWidth: "900px",
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 400,
                color: "#94a3b8",
                lineHeight: 1.4,
                maxWidth: "750px",
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Footer row */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "999px",
                padding: "8px 18px",
              }}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: "15px", fontWeight: 500, color: "#a5b4fc" }}>
                app.avidiatech.com
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
