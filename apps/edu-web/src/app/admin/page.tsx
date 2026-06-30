"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/shell";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

interface Course {
  id: string;
  slug: string;
  title: string;
}
interface ChapterRef {
  id: string;
  index: number;
  title: string;
}
interface ChapterFull {
  id: string;
  title: string;
  index: number;
  material: string;
  vocab: unknown;
  mockTest: unknown;
  homeworkPrompt: string | null;
  published: boolean;
}

export default function AdminPage() {
  return <Shell>{(me) => (me.isAdmin ? <AdminView /> : <NeedAdmin />)}</Shell>;
}

function NeedAdmin() {
  const { t } = useI18n();
  return <p className="text-red-500 text-sm">{t("admin.needAdmin")}</p>;
}

function AdminView() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [slug, setSlug] = useState<string>("");
  const [chapters, setChapters] = useState<ChapterRef[]>([]);
  const [editing, setEditing] = useState<ChapterFull | null>(null);

  useEffect(() => {
    fetch("/api/edu/courses")
      .then((r) => (r.ok ? r.json() : []))
      .then((cs: Course[]) => {
        setCourses(cs);
        if (cs[0]) setSlug(cs[0].slug);
      });
  }, []);

  function loadChapters(s: string) {
    fetch(`/api/edu/courses/${s}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => setChapters(c?.chapters ?? []));
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload chapter list whenever the selected course changes
  useEffect(() => {
    if (slug) loadChapters(slug);
  }, [slug]);

  async function openChapter(id: string) {
    const r = await fetch(`/api/edu/chapters/${id}`);
    if (r.ok) setEditing(await r.json());
  }

  const course = courses.find((c) => c.slug === slug);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-semibold text-2xl tracking-tight">{t("admin.title")}</h1>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">{t("admin.course")}</span>
        <select
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setEditing(null);
          }}
          className="cursor-pointer rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">{t("admin.chapters")}</h2>
          {course ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setEditing({
                  id: "",
                  title: t("admin.newLesson"),
                  index: chapters.length + 1,
                  material: "# Заголовок\n\nТекст урока…",
                  vocab: [],
                  mockTest: [],
                  homeworkPrompt: "",
                  published: true,
                })
              }
            >
              {t("admin.newChapter")}
            </Button>
          ) : null}
        </div>
        <ul className="flex flex-col divide-y divide-border/60">
          {chapters.map((ch) => (
            <li key={ch.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {ch.index}. {ch.title}
              </span>
              <button
                type="button"
                onClick={() => openChapter(ch.id)}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                {t("admin.edit")}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {editing && course ? (
        <ChapterEditor
          chapter={editing}
          courseId={course.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadChapters(slug);
          }}
        />
      ) : null}
    </div>
  );
}

function ChapterEditor({
  chapter,
  courseId,
  onClose,
  onSaved,
}: {
  chapter: ChapterFull;
  courseId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(chapter.title);
  const [index, setIndex] = useState(chapter.index);
  const [material, setMaterial] = useState(chapter.material);
  const [homework, setHomework] = useState(chapter.homeworkPrompt ?? "");
  const [vocab, setVocab] = useState(JSON.stringify(chapter.vocab ?? [], null, 2));
  const [mockTest, setMockTest] = useState(JSON.stringify(chapter.mockTest ?? [], null, 2));
  const [busy, setBusy] = useState(false);
  const isNew = !chapter.id;

  async function save() {
    let vocabParsed: unknown;
    let testParsed: unknown;
    try {
      vocabParsed = JSON.parse(vocab);
      testParsed = JSON.parse(mockTest);
    } catch {
      toast.error(t("admin.jsonErr"));
      return;
    }
    const body = {
      index,
      title,
      material,
      homeworkPrompt: homework || undefined,
      vocab: vocabParsed,
      mockTest: testParsed,
      published: true,
    };
    setBusy(true);
    const r = await fetch(
      isNew
        ? `/api/edu/admin/courses/${courseId}/chapters`
        : `/api/edu/admin/chapters/${chapter.id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setBusy(false);
    if (r.ok) {
      toast.success(isNew ? t("admin.created") : t("admin.saved"));
      onSaved();
    } else {
      toast.error(t("admin.saveErr"));
    }
  }

  async function remove() {
    if (isNew) return onClose();
    setBusy(true);
    const r = await fetch(`/api/edu/admin/chapters/${chapter.id}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) {
      toast.success(t("admin.deleted"));
      onSaved();
    } else {
      toast.error(t("admin.delErr"));
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-medium">{isNew ? t("admin.new") : t("admin.editing")}</h2>
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-muted-foreground text-xs">{t("admin.f.title")}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-foreground"
            />
          </label>
          <label className="w-24">
            <span className="mb-1 block text-muted-foreground text-xs">{t("admin.f.order")}</span>
            <input
              type="number"
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-foreground"
            />
          </label>
        </div>
        <Field label={t("admin.f.material")} value={material} onChange={setMaterial} rows={8} />
        <Field label={t("admin.f.homework")} value={homework} onChange={setHomework} rows={2} />
        <Field label={t("admin.f.vocab")} value={vocab} onChange={setVocab} rows={5} mono />
        <Field label={t("admin.f.test")} value={mockTest} onChange={setMockTest} rows={5} mono />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" loading={busy} onClick={save}>
          {t("admin.save")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t("admin.cancel")}
        </Button>
        {!isNew ? (
          <button
            type="button"
            onClick={remove}
            className="ml-auto cursor-pointer text-red-500 text-xs hover:underline"
          >
            {t("admin.delete")}
          </button>
        ) : null}
      </div>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  rows,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  mono?: boolean;
}) {
  return (
    <label>
      <span className="mb-1 block text-muted-foreground text-xs">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`w-full rounded-lg border border-border bg-background p-3 outline-none focus:border-foreground ${mono ? "font-mono text-xs" : "text-sm"}`}
      />
    </label>
  );
}
