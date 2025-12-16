"use client";

import React from "react";
import NotificationsList from "@/components/monitor/NotificationsList";

export default function MonitorNotificationsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Monitor Notifications</h1>
      <NotificationsList />
    </main>
  );
}
