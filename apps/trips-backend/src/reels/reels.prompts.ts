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
        '"address": string, "district": string, "priceHint": string, ' +
        '"summary": string, "nameEn": string, ' +
        '"durationMin": number, "distanceKm": number, "keywords": string[]}\n\n' +
        "Rules:\n" +
        "- `query` is what Kakao will search for. Prefer the Korean form of a place name: " +
        "Kakao's index is Korean, so 'Onion Seongsu' should become '어니언 성수'. If the note " +
        "gives no name at all, omit `query` entirely rather than inventing one.\n" +
        "- `categoryGroup`: FD6 restaurant, CE7 cafe, AT4 tourist attraction, CT1 culture/" +
        "entertainment, AD5 accommodation. Omit if genuinely unclear.\n" +
        "- `address` is a street address if the text contains one, copied verbatim in Korean " +
        "form ('명동10길 19-3'). This is the most valuable field you can fill: it resolves a " +
        "place exactly, where a name may not exist in the map index at all.\n" +
        "- `district` is the area only ('성수동', '홍대', '강남'), never the full address.\n" +
        "- When a hashtag and an address disagree about the location, TRUST THE ADDRESS. Reels " +
        "are tagged for reach, not accuracy — one measured example tagged #hongdae for a cafe " +
        "whose address was in 명동.\n" +
        "- `summary`: ONE line of plain English saying what this place is and why someone " +
        "saved it — 'All-you-can-eat Korean BBQ, 6 beef and 4 pork cuts, salad bar included'. " +
        "This is read by someone deciding at a glance, so lead with the thing that " +
        "distinguishes it. Write it even when the source is Russian or Korean.\n" +
        "- `nameEn`: the romanised or English name if the source gives one. Never invent a " +
        "translation of a Korean name — omit instead.\n" +
        "- `priceHint`: copy any price the note mentions, verbatim, with its currency.\n" +
        "- `durationMin` / `distanceKm`: only if stated ('약 2시간', '3km 코스'). Hikes and walks " +
        "usually say; restaurants never do. Convert hours to minutes. Do not estimate.\n" +
        "- For a hike, `query` should be the PEAK or trail name on its own ('제비봉'), and put " +
        "the mountain or park in `district`. Qualifying the query with the mountain can return " +
        "nothing: 월악산 and 제비봉 sit in different counties, so '월악산 제비봉' matches zero " +
        "places while '제비봉' resolves immediately.\n" +
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
