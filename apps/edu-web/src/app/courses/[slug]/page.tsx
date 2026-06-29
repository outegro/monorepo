"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";

interface ChapterRef {
  id: string;
  index: number;
  title: string;
  published: boolean;
  unlocked: boolean;
}
interface CourseDetail {
  title: string;
  description: string | null;
  chapters: ChapterRef[];
}

export default function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <Shell>{() => <CourseView slug={slug} />}</Shell>;
}

function CourseView({ slug }: { slug: string }) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  useEffect(() => {
    fetch(`/api/edu/courses/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setCourse)
      .catch(() => setCourse(null));
  }, [slug]);

  if (!course) {
    return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/courses" className="text-muted-foreground text-sm hover:text-foreground">
          ← Все курсы
        </Link>
        <h1 className="mt-2 font-semibold text-2xl tracking-tight">{course.title}</h1>
        {course.description ? (
          <p className="mt-1 text-muted-foreground text-sm">{course.description}</p>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2">
        {course.chapters.map((ch) => {
          const inner = (
            <Card
              className={
                ch.unlocked
                  ? "flex items-center justify-between transition-colors hover:border-foreground/30"
                  : "flex items-center justify-between opacity-60"
              }
            >
              <span>
                <span className="text-muted-foreground">{ch.index}.</span> {ch.title}
                {!ch.published ? (
                  <span className="ml-2 text-amber-600 text-xs">(черновик)</span>
                ) : null}
              </span>
              <span className="text-muted-foreground text-sm">{ch.unlocked ? "→" : "🔒"}</span>
            </Card>
          );
          return (
            <li key={ch.id}>
              {ch.unlocked ? <Link href={`/chapters/${ch.id}`}>{inner}</Link> : inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
