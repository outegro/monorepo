/**
 * Locale strings for backend-rendered channels (email/telegram). API responses do
 * NOT localize — they return codes the frontend translates. Only content the backend
 * itself renders lives here.
 */
export const emailStrings = {
  login_code: {
    ru: {
      subject: "Код входа в Outegro",
      heading: "Ваш код входа в Outegro",
      note: "Код действует 10 минут. Если вы не запрашивали вход — проигнорируйте это письмо.",
    },
    en: {
      subject: "Your Outegro sign-in code",
      heading: "Your Outegro sign-in code",
      note: "The code is valid for 10 minutes. If you didn't request it, ignore this email.",
    },
  },
  security_alert: {
    ru: {
      subject: "Безопасность Outegro",
      fallback: "Зафиксирована новая активность в вашем аккаунте.",
    },
    en: {
      subject: "Outegro security",
      fallback: "New activity was detected on your account.",
    },
  },
} as const;
