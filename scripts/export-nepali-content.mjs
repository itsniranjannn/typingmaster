/**
 * Writes docs/nepali-content-review.md: every Nepali sentence, quote, word and Loksewa
 * passage the app uses, as a checklist for a native speaker to proofread.
 *
 *   node scripts/export-nepali-content.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NEPALI_QUOTES, NEPALI_SENTENCES, NEPALI_WORDS } from "../src/data/nepaliText.js";
import { LOKSEWA_PASSAGES, LOKSEWA_TITLES } from "../src/data/loksewaPassages.js";
import { NEPALI_LESSONS } from "../src/data/nepaliLessons.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lines = [];
const list = (items, format = (item) => item) => items.forEach((item, index) => lines.push(`- [ ] ${index + 1}. ${format(item, index)}`));

lines.push("# Nepali content review", "");
lines.push(
  "Written by a non-native author. Please check **spelling, grammar and natural phrasing**, and mark each line.",
  "",
  "Notes for the reviewer:",
  "- Texts avoid letters the built-in layout cannot type (for example ZWJ forms such as पुर्‍याउन are spelled without ZWJ).",
  "- Change the text in `src/data/nepaliText.js`, `src/data/loksewaPassages.js` or `src/data/nepaliLessons.js`; `npm test` re-checks that every character is typeable.",
  ""
);

lines.push(`## Loksewa passages (${LOKSEWA_PASSAGES.length})`, "");
list(LOKSEWA_PASSAGES, (text, index) => `**${LOKSEWA_TITLES[index]}**: ${text}`);

lines.push("", `## Practice sentences (${NEPALI_SENTENCES.length})`, "");
list(NEPALI_SENTENCES);

lines.push("", `## Quotes (${NEPALI_QUOTES.length})`, "");
list(NEPALI_QUOTES);

lines.push("", `## Words (${NEPALI_WORDS.length})`, "");
lines.push(NEPALI_WORDS.map((word) => `\`${word}\``).join(" · "));

lines.push("", "## Lesson word lists", "");
NEPALI_LESSONS.filter((lesson) => lesson.kind === "words" && lesson.id !== "real-words").forEach((lesson) => {
  lines.push(`### ${lesson.title}`, "", lesson.words.map((word) => `\`${word}\``).join(" · "), "");
});

mkdirSync(join(root, "docs"), { recursive: true });
writeFileSync(join(root, "docs", "nepali-content-review.md"), lines.join("\n") + "\n", "utf8");
console.log(`Wrote docs/nepali-content-review.md (${lines.length} lines)`);
