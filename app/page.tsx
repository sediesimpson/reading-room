"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type TestRow = { id: number; message: string };

// Step 1 only: prove the page can read from Supabase.
export default function Home() {
  const [rows, setRows] = useState<TestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("test")
      .select("*")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data);
      });
  }, []);

  return (
    <section className="mt-10 rounded-card border border-line p-6">
      <h1 className="text-2xl font-semibold">connection test</h1>
      {error && <p className="mt-3 text-muted">could not reach supabase: {error}</p>}
      {!error && rows.length === 0 && <p className="mt-3 text-muted">loading…</p>}
      {rows.map((row) => (
        <p key={row.id} className="mt-3 inline-block rounded-card bg-accent px-4 py-2">
          {row.message}
        </p>
      ))}
    </section>
  );
}
