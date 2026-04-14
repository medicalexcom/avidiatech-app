/**
 * AvidiaTech brand components — single source of truth for the logo.
 *
 *  <LogoMark />        — Neural Node "A" icon only (navbars, favicons, etc.)
 *  <LogoLockup />      — icon + "AvidiaTech" wordmark side-by-side
 *  <LogoStack />       — icon centered above "AvidiaTech" (auth pages)
 *
 * Design: Hexagonal neural-network mark with 6 vertex nodes + center hub,
 * spoke + rim connections, indigo → violet → pink gradient.
 */

import type { SVGProps } from "react";

// ─── Stable uid ───────────────────────────────────────────────────────────────
let _uid = 0;
function nextId() {
  return `nm${(_uid = (_uid + 1) % 9999)}`;
}

// ─── Hex geometry helpers ─────────────────────────────────────────────────────
function hexNodes(cx: number, cy: number, r: number) {
  // 6 vertices starting at top (-90°), clockwise, + center
  const angles = [-90, -30, 30, 90, 150, 210];
  const verts = angles.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: +(cx + r * Math.cos(rad)).toFixed(2),
      y: +(cy + r * Math.sin(rad)).toFixed(2),
    };
  });
  return [...verts, { x: cx, y: cy }]; // index 6 = center
}

// ─── Core SVG mark (rendered inside a parent <svg>) ──────────────────────────
function NeuralMark({
  uid,
  size,
  showGlow,
}: {
  uid: string;
  size: number;
  showGlow: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const nodeR = size * 0.305; // hex radius

  const nodes = hexNodes(cx, cy, nodeR);

  const rimEdges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
  ];
  const spokeEdges: [number, number][] = [
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  ];
  // Long cross-diagonals for extra neural depth
  const crossEdges: [number, number][] = [[0, 3], [1, 4], [2, 5]];

  const gradId = `nm-g-${uid}`;
  const glowId = `nm-rg-${uid}`;

  return (
    <>
      <defs>
        {/* Main gradient — diagonal, indigo → violet → pink */}
        <linearGradient
          id={gradId}
          x1="0"
          y1="0"
          x2={size}
          y2={size}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#6366f1" />
          <stop offset="48%"  stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#e879f9" />
        </linearGradient>
        {/* Radial glow for dark backgrounds */}
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background glow (suppressed on light bg) */}
      {showGlow && (
        <circle cx={cx} cy={cy} r={cx - 0.5} fill={`url(#${glowId})`} />
      )}

      {/* Cross-diagonals (lowest layer, very subtle) */}
      {crossEdges.map(([a, b], i) => (
        <line
          key={`x${i}`}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke={`url(#${gradId})`}
          strokeWidth={size * 0.022}
          strokeOpacity="0.22"
        />
      ))}

      {/* Rim edges */}
      {rimEdges.map(([a, b], i) => (
        <line
          key={`r${i}`}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke={`url(#${gradId})`}
          strokeWidth={size * 0.028}
          strokeOpacity="0.5"
          strokeLinecap="round"
        />
      ))}

      {/* Spokes */}
      {spokeEdges.map(([a, b], i) => (
        <line
          key={`s${i}`}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke={`url(#${gradId})`}
          strokeWidth={size * 0.033}
          strokeOpacity="0.78"
          strokeLinecap="round"
        />
      ))}

      {/* Vertex nodes */}
      {nodes.slice(0, 6).map((n, i) => (
        <circle
          key={`v${i}`}
          cx={n.x}
          cy={n.y}
          r={size * 0.065}
          fill={`url(#${gradId})`}
        />
      ))}

      {/* Center hub (larger) */}
      <circle
        cx={cx}
        cy={cy}
        r={size * 0.088}
        fill={`url(#${gradId})`}
      />
    </>
  );
}

// ─── LogoMark ─────────────────────────────────────────────────────────────────
export function LogoMark({
  className = "h-8 w-8",
  glowClassName,
  ...rest
}: SVGProps<SVGSVGElement> & { glowClassName?: string }) {
  const uid = nextId();
  const size = 36;
  // glowClassName="" suppresses the glow (e.g. on light backgrounds)
  const showGlow = glowClassName !== "";

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={[
        className,
        showGlow
          ? (glowClassName ?? "drop-shadow-[0_2px_8px_rgba(99,102,241,0.32)]")
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
      {...rest}
    >
      <NeuralMark uid={uid} size={size} showGlow={showGlow} />
    </svg>
  );
}

// ─── LogoLockup ───────────────────────────────────────────────────────────────
export function LogoLockup({
  tagline = "Product Data OS",
  className = "",
}: {
  tagline?: string | false;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <div className="flex flex-col leading-none">
        <span className="text-[14px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
          AvidiaTech
        </span>
        {tagline && (
          <span className="text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── LogoStack ────────────────────────────────────────────────────────────────
export function LogoStack({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <LogoMark
        className="h-12 w-12"
        glowClassName="drop-shadow-[0_4px_16px_rgba(139,92,246,0.45)]"
      />
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        AvidiaTech
      </p>
    </div>
  );
}
