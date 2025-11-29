'use client';
export default function NotificationsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Notification Center</h1>
      <p className="mb-4">Stay informed about important events across your account.</p>
      <ul className="list-disc ml-6 space-y-2">
        <li>Quota alerts – know when you’re approaching or exceeding monthly limits.</li>
        <li>Ingestion status – receive success or error notifications for ingestion jobs.</li>
        <li>Change monitoring – get notified when manuals, specs or prices update.</li>
        <li>Audit warnings – surface issues like missing data or compliance problems.</li>
        <li>Email and in-app notifications – choose how you’d like to be notified.</li>
      </ul>
    </div>
  );
}
