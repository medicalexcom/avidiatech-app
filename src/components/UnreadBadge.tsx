"use client";

import React from "react";

export default function UnreadBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-600 text-white">{count}</span>;
}
