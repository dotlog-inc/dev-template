"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: number;
  name: string;
  created_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/items`, { cache: "no-store" });
      if (!res.ok) throw new Error(`GET /items failed: ${res.status}`);
      setItems(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch(`${API_BASE}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setName("");
      await load();
    } else {
      setError(`POST /items failed: ${res.status}`);
    }
  };

  return (
    <main>
      <h1>dev-template</h1>
      <p className="muted">API: {API_BASE}</p>

      <form onSubmit={onSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="item name"
        />
        <button type="submit">追加</button>
      </form>

      {error && <p style={{ color: "tomato" }}>{error}</p>}

      <ul>
        {items.map((it) => (
          <li key={it.id}>
            <span>{it.name}</span>
            <span className="muted">{new Date(it.created_at).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
