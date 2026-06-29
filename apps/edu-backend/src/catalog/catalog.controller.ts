import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  type ChapterPatch,
  type ChapterUpsert,
  type CourseUpsert,
  chapterPatchSchema,
  chapterUpsertSchema,
  courseUpsertSchema,
} from "./catalog.contracts";
import { CatalogService } from "./catalog.service";

const ADMIN_ROLES = ["edu:admin", "outegro:admin"];
const isAdmin = (u: AuthUser) => u.roles.some((r) => ADMIN_ROLES.includes(r));

@Controller()
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return { userId: user.userId, roles: user.roles, isAdmin: isAdmin(user) };
  }

  @Get("courses")
  listCourses(@CurrentUser() user: AuthUser) {
    return this.catalog.listCourses(isAdmin(user));
  }

  @Get("courses/:slug")
  course(@Param("slug") slug: string, @CurrentUser() user: AuthUser) {
    return this.catalog.getCourse(slug, user.userId, isAdmin(user));
  }

  @Get("chapters/:id")
  chapter(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.catalog.getChapter(id, user.userId, isAdmin(user));
  }

  @Post("chapters/:id/complete")
  complete(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.catalog.completeChapter(id, user.userId);
  }

  // ── admin (catalog editing on the site) ──
  @Post("admin/courses")
  @UseGuards(AdminGuard)
  createCourse(@Body(new ZodValidationPipe(courseUpsertSchema)) body: CourseUpsert) {
    return this.catalog.createCourse(body);
  }

  @Patch("admin/courses/:id")
  @UseGuards(AdminGuard)
  updateCourse(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(courseUpsertSchema.partial())) body: Partial<CourseUpsert>,
  ) {
    return this.catalog.updateCourse(id, body);
  }

  @Post("admin/courses/:courseId/chapters")
  @UseGuards(AdminGuard)
  createChapter(
    @Param("courseId") courseId: string,
    @Body(new ZodValidationPipe(chapterUpsertSchema)) body: ChapterUpsert,
  ) {
    return this.catalog.createChapter(courseId, body);
  }

  @Patch("admin/chapters/:id")
  @UseGuards(AdminGuard)
  updateChapter(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(chapterPatchSchema)) body: ChapterPatch,
  ) {
    return this.catalog.updateChapter(id, body);
  }

  @Delete("admin/chapters/:id")
  @UseGuards(AdminGuard)
  deleteChapter(@Param("id") id: string) {
    return this.catalog.deleteChapter(id);
  }
}
