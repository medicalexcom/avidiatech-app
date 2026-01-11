"use client";
import React, { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/translate/languageMap";

/**
 * Translation workspace (client component).
 * - Loads product via client fetch to /api/translate/product?productId=...
 * - Allows selecting languages and fields, then calls POST /api/translate
 */

export default function TranslateWorkspace({ params }: { params: { productId: string } }) {
  const productId = params.productId;
  const [product, setProduct] = useState<any>(null);
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["es"]);
  const [selectedFields, setSelectedFields] = useState<string[]>(["name", "description_html"]);
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetch(`/api/translate/product?productId=${productId}`)
      .then((r) => r.json())
      .then((d) => setProduct(d.product ?? null))
      .catch(() => setError("Failed to load product"));
  }, [productId]);

  async function runTranslate() {
    setError(null);
    setLoading(true);
    setTranslations(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, languages: selectedLangs, fields: selectedFields })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "translation_failed");
      } else {
        setTranslations(json.translations ?? null);
      }
    } catch (err: any) {
      setError(err?.message || "network_error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Translate Product</h1>
      {!product && <p>Loading product...</p>}
      {product && (
        <>
          <h2>Source</h2>
          <div>
            <strong>{product.name_raw || "(no name)"}</strong>
            <div dangerouslySetInnerHTML={{ __html: product.description_html || product.description_raw || "" }} />
          </div>

          <div style={{ marginTop: 16 }}>
            <label>Languages</label>
            <div>
              {SUPPORTED_LANGUAGES.map((l) => (
                <label key={l.code} style={{ marginRight: 12 }}>
                  <input
                    type="checkbox"
                    checked={selectedLangs.includes(l.code)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...selectedLangs, l.code] : selectedLangs.filter((x) => x !== l.code);
                      setSelectedLangs(next);
                    }}
                  />{" "}
                  {l.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Fields</label>
            <div>
              {["name", "description_html", "features", "specs"].map((f) => (
                <label key={f} style={{ marginRight: 12 }}>
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(f)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...selectedFields, f] : selectedFields.filter((x) => x !== f);
                      setSelectedFields(next);
                    }}
                  />{" "}
                  {f}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={runTranslate} disabled={loading}>
              Translate Selected
            </button>
            <button
              onClick={() => {
                if (!translations) return;
                const blob = new Blob([JSON.stringify(translations, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${productId}-translations.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{ marginLeft: 8 }}
            >
              Export JSON
            </button>
          </div>

          {loading && <p>Translating…</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          {translations && (
            <div style={{ marginTop: 20 }}>
              <h3>Results</h3>
              {Object.entries(translations as Record<string, any>).map(([lang, payload]) => {
                const p = payload as Record<string, any>;
                return (
                  <div key={lang} style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                    <h4>{lang}</h4>
                    <div>
                      <strong>Name</strong>
                      <div>{p?.name ?? "(none)"}</div>
                    </div>
                    <div>
                      <strong>Description</strong>
                      <div dangerouslySetInnerHTML={{ __html: p?.description_html ?? "" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
