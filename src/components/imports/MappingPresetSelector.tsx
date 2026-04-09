import React, { useEffect, useState } from "react";

type Preset = { id: string; name: string; provider: string; mapping: any };

export function MappingPresetSelector({ provider, onSelect }: { provider?: string; onSelect: (preset: null | Preset) => void }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/mapping-presets");
        const json = await res.json();
        if (json.ok) {
          setPresets((json.presets || []).filter((p: any) => (provider ? p.provider === provider : true)));
        }
      } catch (e) {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [provider]);

  return (
    <div>
      <label htmlFor="mapping-preset" className="block text-sm font-medium text-gray-700">Mapping preset</label>
      <div className="mt-1 flex gap-2 items-center">
        <select id="mapping-preset" onChange={(e) => {
          const id = e.target.value;
          const preset = presets.find(p => p.id === id) ?? null;
          onSelect(preset);
        }} className="border rounded px-2 py-1">
          <option value="">-- Select preset --</option>
          {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {loading && <span className="text-sm text-gray-500">Loading...</span>}
      </div>
    </div>
  );
}
