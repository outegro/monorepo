import type { ChatMessage } from "../llm/llm.service";

/**
 * Turn a human's shorthand note into a Kakao Local search query.
 *
 * The model is deliberately NOT asked to identify the place — it has no way to know, and a
 * confident guess is worse than none because a human has to review every row anyway. Its only
 * job is normalising "тот дворик с граффити в Соннсу" into something Kakao's index can match,
 * which mostly means: pull out the proper noun, romanise/transliterate to Korean where the
 * note used Latin or Cyrillic, and pick a category code.
 */
export function extractionMessages(note: string, url: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You prepare search queries for Kakao Local (the Korean maps API) from short, messy " +
        "notes a traveller wrote about a place they saw in an Instagram reel. Notes may be in " +
        "Russian, English or Korean and are often just a few words.\n\n" +
        "Return STRICT JSON only, no prose, with these optional keys:\n" +
        '{"query": string, "categoryGroup": "FD6"|"CE7"|"AT4"|"CT1"|"AD5", ' +
        '"district": string, "priceHint": string, "keywords": string[]}\n\n' +
        "Rules:\n" +
        "- `query` is what Kakao will search for. Prefer the Korean form of a place name: " +
        "Kakao's index is Korean, so 'Onion Seongsu' should become '어니언 성수'. If the note " +
        "gives no name at all, omit `query` entirely rather than inventing one.\n" +
        "- `categoryGroup`: FD6 restaurant, CE7 cafe, AT4 tourist attraction, CT1 culture/" +
        "entertainment, AD5 accommodation. Omit if genuinely unclear.\n" +
        "- `district` is the area only ('성수동', '홍대', '강남'), never the full address.\n" +
        "- `priceHint`: copy any price the note mentions, verbatim, with its currency.\n" +
        "- Never guess a specific business you are not told about. Omitting a field is always " +
        "better than filling it with a plausible invention — a human reviews every result and " +
        "a wrong-but-confident guess costs them more time than an empty field.",
    },
    {
      role: "user",
      content: `Reel: ${url}\nNote: ${note}`,
    },
  ];
}
