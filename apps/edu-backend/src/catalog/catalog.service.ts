import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ChapterPatch, ChapterUpsert, CourseUpsert } from "./catalog.contracts";
import { CatalogRepository } from "./catalog.repository";

/**
 * Catalog logic: course/chapter reads with progressive unlocking (per-user enrollment),
 * plus admin CRUD. Chapter 1 is unlocked on first visit; completing chapter N unlocks N+1.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly repo: CatalogRepository) {}

  listCourses(isAdmin: boolean) {
    return this.repo.listCourses(isAdmin);
  }

  /** Course detail + chapters annotated with an `unlocked` flag for this user. */
  async getCourse(slug: string, userId: string, isAdmin: boolean) {
    const course = await this.repo.courseBySlug(slug);
    if (!course || (!course.published && !isAdmin)) {
      throw new NotFoundException({ code: "course_not_found" });
    }
    const chapters = await this.repo.chaptersForCourse(course.id, isAdmin);
    let unlockedIndex = isAdmin ? Number.MAX_SAFE_INTEGER : 1;
    if (!isAdmin) {
      const enrollment =
        (await this.repo.enrollment(userId, course.id)) ??
        (await this.repo.upsertEnrollment(userId, course.id, 1));
      unlockedIndex = enrollment.unlockedIndex;
    }
    return {
      ...course,
      chapters: chapters.map((c) => ({
        id: c.id,
        index: c.index,
        title: c.title,
        published: c.published,
        unlocked: isAdmin || c.index <= unlockedIndex,
      })),
    };
  }

  /** Full chapter — enforces publish + unlock (admins bypass both). */
  async getChapter(id: string, userId: string, isAdmin: boolean) {
    const chapter = await this.repo.chapterById(id);
    if (!chapter || (!chapter.published && !isAdmin)) {
      throw new NotFoundException({ code: "chapter_not_found" });
    }
    if (!isAdmin) {
      const enrollment =
        (await this.repo.enrollment(userId, chapter.courseId)) ??
        (await this.repo.upsertEnrollment(userId, chapter.courseId, 1));
      if (chapter.index > enrollment.unlockedIndex) {
        throw new ForbiddenException({ code: "chapter_locked" });
      }
    }
    return chapter;
  }

  /** Mark a chapter done → unlock the next one. Returns the new unlocked index. */
  async completeChapter(id: string, userId: string) {
    const chapter = await this.repo.chapterById(id);
    if (!chapter) {
      throw new NotFoundException({ code: "chapter_not_found" });
    }
    const current = await this.repo.enrollment(userId, chapter.courseId);
    const next = Math.max(current?.unlockedIndex ?? 1, chapter.index + 1);
    await this.repo.upsertEnrollment(userId, chapter.courseId, next);
    return { unlockedIndex: next };
  }

  // ── admin ──
  createCourse(data: CourseUpsert) {
    return this.repo.createCourse(data);
  }

  async updateCourse(id: string, data: Partial<CourseUpsert>) {
    if (!(await this.repo.courseById(id))) {
      throw new NotFoundException({ code: "course_not_found" });
    }
    return this.repo.updateCourse(id, data);
  }

  async createChapter(courseId: string, data: ChapterUpsert) {
    if (!(await this.repo.courseById(courseId))) {
      throw new NotFoundException({ code: "course_not_found" });
    }
    return this.repo.createChapter(courseId, data);
  }

  async updateChapter(id: string, data: ChapterPatch) {
    if (!(await this.repo.chapterById(id))) {
      throw new NotFoundException({ code: "chapter_not_found" });
    }
    return this.repo.updateChapter(id, data);
  }

  async deleteChapter(id: string) {
    if (!(await this.repo.chapterById(id))) {
      throw new NotFoundException({ code: "chapter_not_found" });
    }
    await this.repo.deleteChapter(id);
    return { deleted: true };
  }
}
