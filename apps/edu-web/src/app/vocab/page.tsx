"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

interface Entry {
  id: string;
  ko: string;
  ru: string;
  romanization: string | null;
}

export default function VocabPage() {
  return <Shell>{() => <VocabView />}</Shell>;
}

function VocabView() {
  const { t } = useI18n();
  const [items, setItems] = useState<Entry[]>([]);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  function load() {
    fetch("/api/edu/vocab")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));
  }
  useEffect(load, []);

  async function remove(id: string) {
    await fetch(`/api/edu/vocab/${id}`, { method: "DELETE" });
    setItems((xs) => xs.filter((x) => x.id !== id));
    toast.success(t("vocab.deleted"));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">{t("vocab.title")}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{t("vocab.hint")}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("vocab.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((e) => (
            <Card
              key={e.id}
              className="flex min-h-24 cursor-pointer select-none flex-col items-center justify-center text-center transition-colors hover:border-foreground/30"
            >
              <button
                type="button"
                onClick={() => setFlipped((f) => ({ ...f, [e.id]: !f[e.id] }))}
                className="flex w-full cursor-pointer flex-col items-center gap-1"
              >
                {flipped[e.id] ? (
                  <span className="text-muted-foreground text-sm">
                    {e.romanization ? `${e.romanization} · ` : ""}
                    {e.ru}
                  </span>
                ) : (
                  <span className="font-semibold text-lg">{e.ko}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => remove(e.id)}
                className="mt-2 cursor-pointer text-muted-foreground text-xs hover:text-red-500"
              >
                удалить
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
