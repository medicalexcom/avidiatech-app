"use client";

import { useEffect, useState } from 'react';

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

export default function RolesPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/v1/tenants/me');
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Unable to load team');
          return;
        }
        setMembers(json.members || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <p className="text-gray-700">Team membership is tied to Clerk users and scoped to your tenant.</p>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {loading && <p className="text-sm text-gray-600">Loading members...</p>}

      {!loading && (
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">User</th>
              <th className="py-2">Role</th>
              <th className="py-2">Joined</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b">
                <td className="py-2">{member.user_id}</td>
                <td className="py-2">{member.role}</td>
                <td className="py-2">{member.created_at?.slice(0, 10)}</td>
                <td className="py-2">{member.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
