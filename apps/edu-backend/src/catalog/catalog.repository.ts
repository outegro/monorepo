import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { ChapterPatch, ChapterUpsert, CourseUpsert } from "./catalog.contracts";

/** All edu catalog DB access — explicit queries, no lazy relations (CLAUDE.md rule). */
@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCourses(includeUnpublished: boolean) {
    return this.prisma.course.findMany({
      where: includeUnpublished ? {} : { published: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  courseBySlug(slug: string) {
    return this.prisma.course.findUnique({ where: { slug } });
  }

  courseById(id: string) {
    return this.prisma.course.findUnique({ where: { id } });
  }

  chaptersForCourse(courseId: string, includeUnpublished: boolean) {
    return this.prisma.chapter.findMany({
      where: { courseId, ...(includeUnpublished ? {} : { published: true }) },
      orderBy: { index: "asc" },
    });
  }

  chapterById(id: string) {
    return this.prisma.chapter.findUnique({ where: { id } });
  }

  enrollment(userId: string, courseId: string) {
    return this.prisma.enrollment.findUnique({
      where: { enrollment_user_course_uq: { userId, courseId } },
    });
  }

  upsertEnrollment(userId: string, courseId: string, unlockedIndex: number) {
    return this.prisma.enrollment.upsert({
      where: { enrollment_user_course_uq: { userId, courseId } },
      create: { userId, courseId, unlockedIndex },
      update: { unlockedIndex },
    });
  }

  createCourse(data: CourseUpsert) {
    return this.prisma.course.create({ data });
  }

  updateCourse(id: string, data: Partial<CourseUpsert>) {
    return this.prisma.course.update({ where: { id }, data });
  }

  createChapter(courseId: string, data: ChapterUpsert) {
    return this.prisma.chapter.create({
      data: {
        courseId,
        index: data.index,
        title: data.title,
        material: data.material,
        vocab: data.vocab as unknown as Prisma.InputJsonValue,
        mockTest: data.mockTest as unknown as Prisma.InputJsonValue,
        homeworkPrompt: data.homeworkPrompt ?? null,
        recordingUrl: data.recordingUrl ?? null,
        published: data.published,
      },
    });
  }

  updateChapter(id: string, data: ChapterPatch) {
    return this.prisma.chapter.update({
      where: { id },
      data: {
        ...(data.index !== undefined ? { index: data.index } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.material !== undefined ? { material: data.material } : {}),
        ...(data.vocab !== undefined
          ? { vocab: data.vocab as unknown as Prisma.InputJsonValue }
          : {}),
        ...(data.mockTest !== undefined
          ? { mockTest: data.mockTest as unknown as Prisma.InputJsonValue }
          : {}),
        ...(data.homeworkPrompt !== undefined ? { homeworkPrompt: data.homeworkPrompt } : {}),
        ...(data.recordingUrl !== undefined ? { recordingUrl: data.recordingUrl } : {}),
        ...(data.published !== undefined ? { published: data.published } : {}),
      },
    });
  }

  deleteChapter(id: string) {
    return this.prisma.chapter.delete({ where: { id } });
  }
}
