"use client";

import { useEffect, useState } from 'react';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at?: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/v1/api-keys');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load keys');
        return;
      }
      setKeys(json.keys || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const createKey = async () => {
    if (!name) return;
    setLoading(true);
    setError(null);
    const res = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || 'Unable to create key');
      return;
    }
    if (json.key) {
      setNewKey(json.key);
    }
    await fetchKeys();
    setName('');
  };

  const revokeKey = async (id: string) => {
    await fetch('/api/v1/api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await fetchKeys();
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-3xl font-bold mb-1">API Keys</h1>
        <p className="text-sm text-gray-600">
          Tenant context is resolved from your Clerk session—keys are scoped automatically.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name"
          className="border rounded px-2 py-1 text-sm flex-1"
        />
        <button
          onClick={createKey}
          disabled={!name || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
        >
          {loading ? 'Creating…' : 'Create key'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {newKey && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-gray-800">
          <p className="font-semibold mb-1">New key generated</p>
          <p className="break-all">
            <code>{newKey}</code>
          </p>
          <p className="text-red-600 mt-1">This is the only time you’ll see the full key. Store it securely.</p>
        </div>
      )}
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Name</th>
            <th className="py-2">Prefix</th>
            <th className="py-2">Created</th>
            <th className="py-2">Revoked</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.id} className="border-b hover:bg-gray-50">
              <td className="py-2">{key.name}</td>
              <td className="py-2">{key.prefix}</td>
              <td className="py-2">{key.created_at?.slice(0, 10)}</td>
              <td className="py-2">{key.revoked_at ? key.revoked_at.slice(0, 10) : '-'}</td>
              <td className="py-2">
                {!key.revoked_at && (
                  <button
                    onClick={() => revokeKey(key.id)}
                    className="text-red-600 hover:underline"
                  >
                    Revoke
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
