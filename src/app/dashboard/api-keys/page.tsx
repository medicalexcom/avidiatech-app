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
  const [tenantId, setTenantId] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  // Fetch keys when tenantId changes
  useEffect(() => {
    if (!tenantId) return;
    const fetchKeys = async () => {
      const res = await fetch(`/api/v1/api-keys?tenant_id=${encodeURIComponent(tenantId)}`);
      const json = await res.json();
      setKeys(json.keys || []);
    };
    fetchKeys();
  }, [tenantId]);

  // Handler to create a new key
  const createKey = async () => {
    if (!name || !tenantId) return;
    setLoading(true);
    const res = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, name }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.key) {
      setNewKey(json.key);
    }
    // refresh list
    const listRes = await fetch(`/api/v1/api-keys?tenant_id=${encodeURIComponent(tenantId)}`);
    const listJson = await listRes.json();
    setKeys(listJson.keys || []);
    setName('');
  };

  const revokeKey = async (id: string) => {
    await fetch('/api/v1/api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    // refresh list
    const res = await fetch(`/api/v1/api-keys?tenant_id=${encodeURIComponent(tenantId)}`);
    const json = await res.json();
    setKeys(json.keys || []);
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">API Keys</h1>
      <p className="mb-4 text-sm text-gray-600">
        Manage programmatic access to your AvidiaTech tenant.  Only owners and admins can create or revoke keys.
      </p>
      <div className="mb-4">
        <input
          type="text"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          placeholder="Tenant ID"
          className="border rounded px-2 py-1 mr-2 text-sm"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name"
          className="border rounded px-2 py-1 mr-2 text-sm"
        />
        <button
          onClick={createKey}
          disabled={!tenantId || !name || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
        >
          {loading ? 'Creating…' : 'Create key'}
        </button>
      </div>
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
