"use client";

/**
 * Monitor product page
 *
 * AvidiaMonitor tracks changes to your products over time.  It monitors price,
 * availability, and variant updates and notifies you of significant changes.
 */
export default function MonitorPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Monitor</h1>
      <p className="mb-4">
        AvidiaMonitor tracks changes to your products over time.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Tracks price, availability, and attribute changes across your catalog</li>
        <li>Schedules periodic crawls to detect new or removed variants</li>
        <li>Notifies you of significant changes via email or webhook</li>
        <li>Maintains a history of changes for auditing and analytics</li>
      </ul>
    </div>
  );
}
