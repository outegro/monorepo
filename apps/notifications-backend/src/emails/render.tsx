import type { Locale, NotifyTemplate } from "@outegro/contracts";
import { render } from "@react-email/components";
import { LoginCodeEmail } from "./login-code";
import { SecurityAlertEmail } from "./security-alert";
import { emailStrings } from "./strings";

export interface RenderedMessage {
  subject: string;
  html: string;
  text: string;
}

/**
 * Render a template to subject + html + plaintext for the given locale. Returns null
 * for an unknown template (consumer drops it rather than failing the event).
 */
export async function renderNotification(
  template: NotifyTemplate,
  locale: Locale,
  data: Record<string, unknown>,
): Promise<RenderedMessage | null> {
  if (template === "login_code") {
    const code = String(data.code ?? "");
    const element = <LoginCodeEmail code={code} locale={locale} />;
    return {
      subject: emailStrings.login_code[locale].subject,
      html: await render(element),
      text: await render(element, { plainText: true }),
    };
  }

  if (template === "security_alert") {
    const strings = emailStrings.security_alert[locale];
    const message =
      typeof data.message === "string" && data.message.length > 0 ? data.message : strings.fallback;
    const element = <SecurityAlertEmail message={message} locale={locale} />;
    return {
      subject: strings.subject,
      html: await render(element),
      text: await render(element, { plainText: true }),
    };
  }

  return null;
}
