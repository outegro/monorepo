-- edu-backend init: courses / chapters / enrollments / homework / vocab / outbox

CREATE TABLE "courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

CREATE TABLE "chapters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "vocab" JSONB NOT NULL DEFAULT '[]',
    "mock_test" JSONB NOT NULL DEFAULT '[]',
    "homework_prompt" TEXT,
    "recording_url" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "chapters_course_id_index_key" ON "chapters"("course_id", "index");
CREATE INDEX "chapters_course_id_idx" ON "chapters"("course_id");
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "unlocked_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "enrollments_user_id_course_id_key" ON "enrollments"("user_id", "course_id");

CREATE TABLE "homework_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "answer" TEXT NOT NULL,
    "score" INTEGER,
    "feedback" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "homework_submissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "homework_submissions_user_id_chapter_id_idx" ON "homework_submissions"("user_id", "chapter_id");

CREATE TABLE "vocab_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ko" TEXT NOT NULL,
    "ru" TEXT NOT NULL,
    "romanization" TEXT,
    "chapter_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "vocab_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vocab_entries_user_id_ko_key" ON "vocab_entries"("user_id", "ko");
CREATE INDEX "vocab_entries_user_id_idx" ON "vocab_entries"("user_id");

CREATE TABLE "outbox" (
    "id" UUID NOT NULL,
    "exchange" TEXT NOT NULL,
    "routing_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "outbox_published_at_idx" ON "outbox"("published_at");
