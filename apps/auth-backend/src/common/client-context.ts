/** Request-derived client metadata, stored on sessions and used for security alerts. */
export interface ClientContext {
  userAgent?: string;
  ip?: string;
  country?: string;
  city?: string;
}
