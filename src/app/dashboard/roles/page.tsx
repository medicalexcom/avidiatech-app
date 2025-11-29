'use client';

export default function RolesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Roles & Permissions</h1>
      <p className="mb-4">Control access to sensitive actions and data across your team.</p>
      <ul className="list-disc ml-6 space-y-2">
        <li>Owner – full control over billing, team management and all features.</li>
        <li>Admin – can manage products, view analytics and invite/remove users.</li>
        <li>Member – can view and edit products but cannot change billing or team settings.</li>
        <li>Custom roles – design your own roles with granular permissions (coming soon).</li>
      </ul>
    </div>
  );
}
