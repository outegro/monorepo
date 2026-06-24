import { z } from "zod";

export const requestCodeSchema = z.object({
  email: z.email().max(254).toLowerCase().trim(),
});
export type RequestCodeDto = z.infer<typeof requestCodeSchema>;

export const verifyCodeSchema = z.object({
  email: z.email().max(254).toLowerCase().trim(),
  code: z.string().regex(/^\d{6}$/, "code must be 6 digits"),
});
export type VerifyCodeDto = z.infer<typeof verifyCodeSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDto = z.infer<typeof refreshSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutDto = z.infer<typeof logoutSchema>;
