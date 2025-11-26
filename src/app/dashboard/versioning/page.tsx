'use client';

export default function VersioningPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Versioning & History</h1>
      <p className="mb-4">
        Track and manage changes to your products over time. This module allows you to see previous versions and revert when needed.
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li>Automatic versioning for product specs, descriptions and other fields.</li>
        <li>View a timeline of changes with timestamps and user info.</li>
        <li>Compare differences between versions to see what changed.</li>
        <li>Restore earlier versions to undo mistakes or recover overwritten data.</li>
      </ul>
    </div>
  );
}
