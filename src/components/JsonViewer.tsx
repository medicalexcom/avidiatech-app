"use client";

import React from "react";

type JsonViewerProps = {
  data: unknown;
  loading?: boolean;
  /** how many levels should be expanded by default */
  collapsedLevels?: number;
};

/**
 * Human-friendly JSON viewer for the right-hand panel.
 *
 * - Renders objects/arrays as a collapsible tree.
 * - Uses indentation, monospaced font, subtle colors.
 * - Avoids long single-line JSON "noise".
 */
export default function JsonViewer({
  data,
  loading,
  collapsedLevels = 1,
}: JsonViewerProps) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const toggle = (path: string) => {
    setExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const hasData =
    data !== null &&
    data !== undefined &&
    !(typeof data === "object" && Object.keys(data as any).length === 0);

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

  return (
    <div className="bg-neutral-900/60 border border-neutral-700 rounded-md p-3 text-xs font-mono text-neutral-50 overflow-auto max-h-[460px]">
      <JsonNode
        name={undefined}
        value={data}
        path="$"
        level={0}
        expandedState={expanded}
        toggle={toggle}
        defaultExpandedLevels={collapsedLevels}
      />
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
};

function JsonNode({
  name,
  value,
  path,
  level,
  expandedState,
  toggle,
  defaultExpandedLevels,
}: JsonNodeProps) {
  const type = getType(value);
  const isComplex = type === "object" || type === "array";

  const indent = level * 14; // px
  const isExpanded =
    expandedState[path] ?? level < defaultExpandedLevels;

  const handleToggle = () => {
    if (!isComplex) return;
    toggle(path);
  };

  const label = name !== undefined ? name : undefined;

  if (!isComplex) {
    return (
      <div style={{ paddingLeft: indent }} className="leading-5">
        {label !== undefined && (
          <span className="text-sky-300 mr-1">
            {JSON.stringify(label)}:
          </span>
        )}
        <Primitive value={value} />
      </div>
    );
  }

  // Object / array
  const entries =
    type === "object"
      ? Object.entries(value as Record<string, unknown>)
      : (value as any[]).map((v, i) => [String(i), v]);

  const bracketOpen = type === "object" ? "{" : "[";
  const bracketClose = type === "object" ? "}" : "]";

  return (
    <div className="leading-5">
      <div
        style={{ paddingLeft: indent }}
        className={`cursor-pointer select-none flex items-start gap-1 ${
          isComplex ? "hover:bg-neutral-800/60 rounded-sm" : ""
        }`}
        onClick={handleToggle}
      >
        <span className="mt-[1px] text-neutral-400">
          {isComplex ? (isExpanded ? "▾" : "▸") : " "}
        </span>

        <div>
          {label !== undefined && (
            <span className="text-sky-300 mr-1">
              {JSON.stringify(label)}:
            </span>
          )}
          <span className="text-neutral-300">
            {bracketOpen}
            {!isExpanded && entries.length > 0 && "…"}
            {entries.length === 0 && bracketClose}
          </span>
        </div>
      </div>

      {isExpanded && entries.length > 0 && (
        <div>
          {entries.map(([k, v], idx) => {
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
                />
                {!isLast && (
                  <span
                    style={{ paddingLeft: (level + 1) * 14 }}
                    className="text-neutral-500"
                  >
                    ,
                  </span>
                )}
              </div>
            );
          })}
          <div style={{ paddingLeft: indent }} className="text-neutral-300">
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
    return <span className="text-orange-300">{String(value)}</span>;
  }

  if (type === "boolean") {
    return <span className="text-indigo-300">{String(value)}</span>;
  }

  return (
    <span className="text-neutral-300">
      {JSON.stringify(value)}
    </span>
  );
}

function getType(value: unknown): "null" | "string" | "number" | "boolean" | "object" | "array" | "other" {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "object") return "object";
  return "other";
}
