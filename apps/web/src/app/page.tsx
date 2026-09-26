"use client";

import { useEffect, useState } from "react";

import { API_BASE, createItem, fetchItems, toMessage, type Item } from "@/lib/items";

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      setItems(await fetchItems());
      setError(null);
    } catch (e) {
      setError(toMessage(e));
    }
  };

  // setState は取得の完了後（Promise の解決時）にだけ行う。effect の本体で同期的に
  // 呼ぶと react-hooks/set-state-in-effect に当たる。ignore は unmount 後の更新を捨てるため
  useEffect(() => {
    let ignore = false;
    fetchItems().then(
      (data) => {
        if (ignore) return;
        setItems(data);
        setError(null);
      },
      (e: unknown) => {
        if (!ignore) setError(toMessage(e));
      },
    );
    return () => {
      ignore = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createItem(name);
      setName("");
      await reload();
    } catch (err) {
      setError(toMessage(err));
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
