'use client';

export default function OrganizationPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Organization & Team</h1>
      <p className="mb-4">Manage your tenant’s settings and team members.</p>
      <ul className="list-disc ml-6 space-y-2">
        <li>Rename your tenant to match your brand or organization.</li>
        <li>Invite teammates by email and assign them roles: owner, admin or member.</li>
        <li>View active users and pending invitations with status indicators.</li>
        <li>Reassign or remove users to keep your organization up to date.</li>
      </ul>
    </div>
  );
}
