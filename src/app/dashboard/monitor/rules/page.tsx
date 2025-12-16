"use client";

import React from "react";
import RulesAdmin from "@/components/monitor/RulesAdmin";

export default function MonitorRulesPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Monitor Rules</h1>
      <RulesAdmin />
    </main>
  );
}
