"use client";

import React from "react";

type JsonViewerProps = {
  data: unknown;
  loading?: boolean;
  /** how many levels should be expanded by default */
  collapsedLevels?: number;
};

/**
 * Smart, human-friendly JSON viewer inspired by jsonformatter.org:
 *
 * - Auto-focuses on the "useful" root:
 *   - If shape is { ok, data: { normalized_payload } } => shows data.normalized_payload
 *   - Else if shape is { ok, data } => shows data
 *   - Else uses the provided object as-is.
 *
 * - Toolbar:
 *   - Shows which root is currently displayed ("Root: data.normalized_payload")
 *   - Search box to highlight matching keys/values
 *   - Toggle to show the full envelope (raw response) vs focused root.
 *
 * - Tree:
 *   - Collapsible objects/arrays with ▾/▸ arrows
 *   - Indented, monospaced, with colored primitives
 *   - Object/array previews: "{ 12 keys }", "[ 6 items ]"
 */
export default function JsonViewer({
  data,
  loading,
  collapsedLevels = 1,
}: JsonViewerProps) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [filter, setFilter] = React.useState("");
  const [showEnvelope, setShowEnvelope] = React.useState(false);

  const { displayRoot, rootLabel, envelope } = React.useMemo(
    () => getDisplayRoot(data),
    [data]
  );

  const effectiveData = showEnvelope && envelope ? envelope : displayRoot;
  const effectiveLabel = showEnvelope && envelope ? "full response" : rootLabel;

  const hasData =
    effectiveData !== null &&
    effectiveData !== undefined &&
    !(typeof effectiveData === "object" &&
      effectiveData !== null &&
      Object.keys(effectiveData as any).length === 0);

  const toggle = (path: string) => {
    setExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  if (loading) {
    return (
      <div className="text-xs text-neutral-300">
        Loading JSON…
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="text-xs text-neutral-400">
        No JSON data available.
      </div>
    );
  }

  const normalizedFilter = filter.trim().toLowerCase();

  return (
    <div className="text-xs text-neutral-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-neutral-400">
            Root
          </span>
          <code className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-[11px]">
            {effectiveLabel}
          </code>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search key or value"
            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-[11px] text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {envelope && (
            <button
              type="button"
              onClick={() => setShowEnvelope((v) => !v)}
              className={`px-2 py-1 rounded text-[11px] border ${
                showEnvelope
                  ? "bg-neutral-200 text-neutral-900 border-neutral-300"
                  : "bg-neutral-900 text-neutral-100 border-neutral-700 hover:bg-neutral-800"
              }`}
            >
              {showEnvelope ? "Focused view" : "Full response"}
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="bg-neutral-900/60 border border-neutral-700 rounded-md p-3 font-mono overflow-auto max-h-[460px]">
        <JsonNode
          name={undefined}
          value={effectiveData}
          path="$"
          level={0}
          expandedState={expanded}
          toggle={toggle}
          defaultExpandedLevels={collapsedLevels}
          filter={normalizedFilter}
        />
      </div>
    </div>
  );
}

type JsonNodeProps = {
  name?: string;
  value: unknown;
  path: string;
  level: number;
  expandedState: Record<string, boolean>;
  toggle: (path: string) => void;
  defaultExpandedLevels: number;
  filter: string;
};

function JsonNode({
  name,
  value,
  path,
  level,
  expandedState,
  toggle,
  defaultExpandedLevels,
  filter,
}: JsonNodeProps) {
  const type = getType(value);
  const isComplex = type === "object" || type === "array";

  const indent = level * 14; // px
  const isExpanded = expandedState[path] ?? level < defaultExpandedLevels;

  const label = name !== undefined ? name : undefined;

  const filterMatch = filter
    ? matchesFilter(label, value, filter)
    : false;

  const handleToggle = () => {
    if (!isComplex) return;
    toggle(path);
  };

  if (!isComplex) {
    return (
      <div
        style={{ paddingLeft: indent }}
        className={`leading-5 ${
          filter && filterMatch ? "bg-neutral-800/80" : ""
        }`}
      >
        {label !== undefined && (
          <span className="text-sky-300 mr-1">
            {JSON.stringify(label)}:
          </span>
        )}
        <Primitive value={value} />
      </div>
    );
  }

  // Object / array with explicit tuple typing to satisfy TS
  const entries: [string, unknown][] =
    type === "object"
      ? Object.entries(value as Record<string, unknown>)
      : (value as unknown[]).map(
          (v, i) => [String(i), v] as [string, unknown]
        );

  const bracketOpen = type === "object" ? "{" : "[";
  const bracketClose = type === "object" ? "}" : "]";
  const summary =
    type === "object"
      ? `${entries.length} key${entries.length === 1 ? "" : "s"}`
      : `${entries.length} item${entries.length === 1 ? "" : "s"}`;

  return (
    <div className="leading-5">
      {/* Header line */}
      <div
        style={{ paddingLeft: indent }}
        className={`cursor-pointer select-none flex items-start gap-1 rounded-sm ${
          filter && filterMatch ? "bg-neutral-800/80" : "hover:bg-neutral-800/60"
        }`}
        onClick={handleToggle}
      >
        <span className="mt-[1px] text-neutral-400">
          {isExpanded ? "▾" : "▸"}
        </span>

        <div>
          {label !== undefined && (
            <span className="text-sky-300 mr-1">
              {JSON.stringify(label)}:
            </span>
          )}
          <span className="text-neutral-300">{bracketOpen}</span>
          <span className="ml-1 text-[11px] text-neutral-500">
            {summary}
          </span>
          <span className="text-neutral-300">
            {!isExpanded && entries.length > 0 ? " …" : ""}
            {entries.length === 0 && bracketClose}
          </span>
        </div>
      </div>

      {/* Children */}
      {isExpanded && entries.length > 0 && (
        <div>
          {entries.map(([key, val], idx) => {
            const k = key as string;
            const v = val;
            const childPath = `${path}.${k}`;
            const isLast = idx === entries.length - 1;
            return (
              <div key={childPath}>
                <JsonNode
                  name={type === "array" ? undefined : k}
                  value={v}
                  path={childPath}
                  level={level + 1}
                  expandedState={expandedState}
                  toggle={toggle}
                  defaultExpandedLevels={defaultExpandedLevels}
                  filter={filter}
                />
                {!isLast && (
                  <span
                    style={{
                      paddingLeft: (level + 1) * 14,
                    }}
                    className="text-neutral-500"
                  >
                    ,
                  </span>
                )}
              </div>
            );
          })}
          <div
            style={{ paddingLeft: indent }}
            className="text-neutral-300"
          >
            {bracketClose}
          </div>
        </div>
      )}
    </div>
  );
}

function Primitive({ value }: { value: unknown }) {
  const type = getType(value);

  if (value === null) {
    return <span className="text-amber-300">null</span>;
  }

  if (type === "string") {
    return (
      <span className="text-emerald-300">
        {JSON.stringify(value)}
      </span>
    );
  }

  if (type === "number") {
    return (
      <span className="text-orange-300">
        {String(value)}
      </span>
    );
  }

  if (type === "boolean") {
    return (
      <span className="text-indigo-300">
        {String(value)}
      </span>
    );
  }

  return (
    <span className="text-neutral-300">
      {JSON.stringify(value)}
    </span>
  );
}

function getType(
  value: unknown
):
  | "null"
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "other" {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "object") return "object";
  return "other";
}

/**
 * Decide what to show as the "root" for readability.
 * - If data is { ok, data: { normalized_payload } }, prefer normalized_payload.
 * - Else if data is { ok, data }, prefer data.
 * - Else show the object as-is.
 */
function getDisplayRoot(value: unknown): {
  displayRoot: unknown;
  rootLabel: string;
  envelope: unknown | null;
} {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as any;
    if ("data" in obj && obj.data && typeof obj.data === "object") {
      const data = obj.data;
      if ("normalized_payload" in data && data.normalized_payload) {
        return {
          displayRoot: data.normalized_payload,
          rootLabel: "data.normalized_payload",
          envelope: value,
        };
      }
      return {
        displayRoot: data,
        rootLabel: "data",
        envelope: value,
      };
    }
  }

  return {
    displayRoot: value,
    rootLabel: "root",
    envelope: null,
  };
}

/** Filter: does this node match the search term? */
function matchesFilter(
  name: string | undefined,
  value: unknown,
  filter: string
): boolean {
  if (!filter) return false;

  const needle = filter.toLowerCase();

  if (name && name.toLowerCase().includes(needle)) {
    return true;
  }

  if (value === null || value === undefined) return false;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).toLowerCase().includes(needle);
  }

  try {
    const asString = JSON.stringify(value);
    return asString.toLowerCase().includes(needle);
  } catch {
    return false;
  }
}
