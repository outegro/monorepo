import type { Locale } from "@outegro/contracts";
import { Body, Container, Head, Html, Preview, Text } from "@react-email/components";
import { emailStrings } from "./strings";

export interface SecurityAlertEmailProps {
  message: string;
  locale: Locale;
}

/** Non-disableable security alert (new sign-in, session terminated, reuse detected). */
export function SecurityAlertEmail({ message, locale }: SecurityAlertEmailProps) {
  const t = emailStrings.security_alert[locale];
  return (
    <Html>
      <Head />
      <Preview>{t.subject}</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#ffffff" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto", padding: "24px" }}>
          <Text style={{ color: "#0a0a0a" }}>{message}</Text>
          <Text style={{ color: "#aaaaaa", fontSize: "12px", marginTop: "24px" }}>Outegro</Text>
        </Container>
      </Body>
    </Html>
  );
}
