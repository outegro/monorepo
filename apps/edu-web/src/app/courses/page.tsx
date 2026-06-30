"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
}

export default function CoursesPage() {
  return <Shell>{() => <CoursesList />}</Shell>;
}

function CoursesList() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => {
    fetch("/api/edu/courses")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-semibold text-2xl tracking-tight">{t("courses.title")}</h1>
      {courses.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("courses.empty")}</p>
      ) : (
        courses.map((c) => (
          <Link key={c.id} href={`/courses/${c.slug}`}>
            <Card className="transition-colors hover:border-foreground/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium">{c.title}</h2>
                  {c.description ? (
                    <p className="mt-1 text-muted-foreground text-sm">{c.description}</p>
                  ) : null}
                </div>
                {c.level ? (
                  <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground text-xs">
                    {c.level}
                  </span>
                ) : null}
              </div>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
