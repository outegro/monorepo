import type { ChatMessage } from "../llm/llm.service";

/**
 * Prompts for the lore-intake hook. Both ask for STRICT JSON so the UI renders block-by-block
 * (split diff + red-flag cards, structured entry cards) rather than parsing prose.
 */

export function intakeReviewMessages(text: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a senior tech recruiter and résumé coach. The user pastes a raw, unstructured " +
        "brain-dump of their career (roles, projects, education, skills). Return STRICT JSON only, " +
        "no prose outside JSON, matching:\n" +
        '{"improved": string, "redFlags": [{"issue": string, "where": string, "why": string, "fix": string}], "summary": string}\n' +
        "- improved: a rewritten, stronger version of their whole text — tighter, active verbs, " +
        "quantified where the source implies numbers, professional tone. Keep it truthful; never " +
        "invent employers, titles, or figures that aren't implied. Mark any assumption inline in [brackets].\n" +
        "- redFlags: concrete weaknesses (missing metrics, vague phrasing, employment gaps, weak verbs, " +
        "irrelevant detail). `where` quotes the offending snippet; `why` explains the risk to a hiring " +
        "manager; `fix` is a specific, actionable suggestion.\n" +
        "- summary: one sentence overall assessment.",
    },
    { role: "user", content: text },
  ];
}

export function structureMessages(text: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are structuring a person's career narrative into a canonical résumé knowledge base. " +
        "Given their (already reviewed) text, extract discrete entries. Return STRICT JSON only:\n" +
        '{"entries": [{"type": "role|project|achievement|skill|education|note", "title": string, ' +
        '"org": string, "startDate": string, "endDate": string, "body": string, ' +
        '"metrics": [{"label": string, "value": string}], "tags": [string]}]}\n' +
        "- One entry per distinct role/project/degree/notable achievement. Group loose skills into " +
        '`skill` entries. Dates are free-form strings (e.g. "2021-03", "Summer 2020", "present") or empty.\n' +
        "- metrics: pull out any numbers that show impact (%, $, counts, scale). Empty array if none.\n" +
        "- tags: short keywords for later tailoring (technologies, domains). Do not invent facts.",
    },
    { role: "user", content: text },
  ];
}
