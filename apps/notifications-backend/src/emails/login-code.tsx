import type { Locale } from "@outegro/contracts";
import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import { emailStrings } from "./strings";

export interface LoginCodeEmailProps {
  code: string;
  locale: Locale;
}

/** Transactional login-code email. React escapes interpolations → no XSS in templates. */
export function LoginCodeEmail({ code, locale }: LoginCodeEmailProps) {
  const t = emailStrings.login_code[locale];
  return (
    <Html>
      <Head />
      <Preview>{t.heading}</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#ffffff" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto", padding: "24px" }}>
          <Heading as="h2" style={{ color: "#0a0a0a" }}>
            {t.heading}
          </Heading>
          <Text
            style={{ fontSize: "32px", fontWeight: 600, letterSpacing: "6px", color: "#0a0a0a" }}
          >
            {code}
          </Text>
          <Text style={{ color: "#888888" }}>{t.note}</Text>
          <Text style={{ color: "#aaaaaa", fontSize: "12px", marginTop: "24px" }}>Outegro</Text>
        </Container>
      </Body>
    </Html>
  );
}
