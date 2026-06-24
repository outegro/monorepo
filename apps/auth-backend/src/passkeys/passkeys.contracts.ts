import { z } from "zod";

/** WebAuthn ceremony payloads are validated by @simplewebauthn — we only shape-check here. */
const webauthnResponse = z.record(z.string(), z.unknown());

export const registrationVerifySchema = z.object({
  response: webauthnResponse,
  name: z.string().trim().max(64).optional(),
});
export type RegistrationVerifyDto = z.infer<typeof registrationVerifySchema>;

export const authenticationVerifySchema = z.object({
  challengeId: z.string().min(1),
  response: webauthnResponse,
});
export type AuthenticationVerifyDto = z.infer<typeof authenticationVerifySchema>;
