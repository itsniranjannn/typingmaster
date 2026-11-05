/**
 * Browser end-to-end checks for the Nepali typing flow, driven with REAL key events
 * (correct KeyboardEvent.code, Shift and Alt), so layout regressions are caught.
 *
 *   npm run e2e
 *
 * Needs Microsoft Edge or Google Chrome installed (no browser download).
 * Screenshots land in e2e/artifacts/.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright-core";
import { LAYOUTS, getHintText, keyForText, planKeystroke } from "../src/data/keyboardLayouts.js";
import { LOKSEWA_PASSAGES } from "../src/data/loksewaPassages.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = join(root, "e2e", "artifacts");
if (!existsSync(artifacts)) mkdirSync(artifacts, { recursive: true });

const PORT = Number(process.env.E2E_PORT) || 5300 + Math.floor(Math.random() * 600); // random free-ish port so a stale server never blocks a run
const URL = `http://localhost:${PORT}/`;
const ne = LAYOUTS.ne;

/* ---------- keystroke planner: the same walk a learner would do ---------- */
export const keystrokesFor = (text) => {
  const keys = [];
  let rest = text;
  while (rest.length) {
    const first = keyForText(ne, getHintText(rest));
    if (!first) throw new Error(`No key for: ${rest.slice(0, 8)}`);
    keys.push(first);
    const plan = planKeystroke({ output: first.output, pending: "", target: rest });
    if (plan.action === "pending") {
      let pending = plan.pending;
      for (;;) {
        const key = keyForText(ne, getHintText(rest, pending));
        keys.push(key);
        const next = planKeystroke({ output: key.output, pending, target: rest });
        if (next.action === "commit") {
          rest = rest.slice(next.text.length);
          break;
        }
        pending = next.pending;
      }
    } else {
      rest = rest.slice(plan.text.length);
    }
  }
  return keys;
};

const press = async (page, key) => {
  if (key.shift) await page.keyboard.down("Shift");
  if (key.alt) await page.keyboard.down("Alt");
  await page.keyboard.press(key.code);
  if (key.alt) await page.keyboard.up("Alt");
  if (key.shift) await page.keyboard.up("Shift");
};

const typeText = async (page, text) => {
  for (const key of keystrokesFor(text)) await press(page, key);
};

/* ---------- tiny harness ---------- */
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ok   ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(`  FAIL ${name}\n       ${String(error.message || error).split("\n")[0]}`);
  }
};
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const typed = (page) => page.locator('textarea[aria-hidden="true"]').inputValue();
const openApp = async (page, settings = {}) => {
  await page.addInitScript((value) => {
    localStorage.setItem("typingMaster.hasSeenTour", "true");
    if (value) localStorage.setItem("typingMaster.languageSettings", JSON.stringify(value));
  }, settings.language ? { language: "ne", inputMethod: "builtin", showKeyboard: true, showFingerHints: true, ...settings } : null);
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="language-panel"]', { timeout: 20000 });
  await page.waitForTimeout(1200); // intro animation
};
const startLoksewa = async (page, { passage = 8, seconds = 60, target = 30 } = {}) => {
  await page.getByRole("button", { name: /Loksewa typing test/ }).click();
  await page.locator('select[aria-label="Loksewa passage"]').selectOption(String(passage));
  await page.locator('select[aria-label="Loksewa test duration"]').selectOption(String(seconds));
  await page.getByRole("button", { name: String(target) + " WPM" }).click();
  await page.getByRole("button", { name: /Start test/ }).click();
  await page.waitForTimeout(500);
};
const openLesson = async (page, name) => {
  // Lessons unlock in order; unlock them all so any lesson can be tested.
  const unlock = page.getByRole("button", { name: "Unlock all" });
  if (await unlock.count()) await unlock.click();
  await page.getByRole("button", { name }).click();
};
const focusTyping = async (page) => {
  await page.locator(".typing-area").click();
};

/* ---------- dev server ---------- */
// Test the production build by default: React's dev build logs warnings that real users never see
// (for example its nested-update warning under machine-speed typing). E2E_DEV=1 uses the dev server.
const useDevServer = process.env.E2E_DEV === "1";
if (!useDevServer) {
  const build = spawnSync("npx", ["vite", "build"], { cwd: root, shell: true, stdio: "pipe" });
  if (build.status !== 0) {
    console.error(String(build.stdout) + String(build.stderr));
    process.exit(1);
  }
}
const server = spawn("npx", ["vite", useDevServer ? "dev" : "preview", "--port", String(PORT), "--strictPort"], { cwd: root, shell: true, stdio: "pipe" });
const stop = () => {
  try {
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true });
  } catch {
    /* already gone */
  }
};
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("dev server did not start")), 60000);
  server.stdout.on("data", (chunk) => {
    if (String(chunk).includes("Local")) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.on("error", reject);
});

process.on("exit", stop);
let browser;
try {
  browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || "msedge", headless: true });

  /* ===== 1. English has no keyboard ===== */
  console.log("English");
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await openApp(page);
    await check("no on-screen keyboard or finger-hint toggles in English", async () => {
      expect((await page.locator('section[aria-label*="eyboard guide"]').count()) === 0, "keyboard is rendered");
      expect((await page.locator('[role="switch"]').count()) === 0, "toggles are rendered");
    });
    await context.close();
  }

  /* ===== 2. Nepali typing with real keys ===== */
  console.log("Nepali (desktop, built-in layout)");
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", async (message) => {
      if (message.type() !== "error") return;
      // React prints the component stack as extra arguments, so include them all
      const parts = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => "")));
      errors.push(parts.join(" ") || message.text());
    });
    await openApp(page, { language: "ne" });

    await check("keyboard, hands and stat tiles fit one 1366x768 screen", async () => {
      const box = await page.locator('section[aria-label="Nepali keyboard guide"]').boundingBox();
      expect(box && box.y + box.height <= 768, `keyboard bottom is ${box && Math.round(box.y + box.height)}`);
      expect((await page.locator('[data-testid="nepali-stats"]').count()) === 1, "no stat tiles");
    });

    await startLoksewa(page, { passage: 8, seconds: 300 });
    await focusTyping(page);

    await check("types a whole passage prefix with conjuncts, composed vowels and Alt letters at 100%", async () => {
      const prefix = LOKSEWA_PASSAGES[8].slice(0, 90);
      await typeText(page, prefix);
      const value = await typed(page);
      expect(value === prefix, `typed ${JSON.stringify(value.slice(-12))} but expected ${JSON.stringify(prefix.slice(-12))}`);
      const accuracy = await page.locator('[data-testid="nepali-stats"]').innerText();
      expect(/100%/.test(accuracy), `accuracy tile: ${accuracy.replace(/\n/g, " ")}`);
    });
    await page.screenshot({ path: join(artifacts, "nepali-dark.png") });

    await check("ो and ौ are typed as two keys and committed whole", async () => {
      await page.getByRole("button", { name: /Learn Nepali typing/ }).click();
      await openLesson(page, /Vowel signs \(matras\)/);
      await page.waitForTimeout(400);
      await focusTyping(page);
      const text = (await page.locator(".ne-passage").innerText()).replace(/\s+$/, "");
      const prefix = [...text].slice(0, 14).join("");
      await typeText(page, prefix);
      expect((await typed(page)) === prefix, `typed ${JSON.stringify(await typed(page))} expected ${JSON.stringify(prefix)}`);
    });

    await check("half-typed vowel shows a preview, then commits", async () => {
      await page.getByRole("button", { name: /Vowel signs \(matras\)/ }).click(); // new drill
      await page.waitForTimeout(400);
      await focusTyping(page);
      const text = await page.locator(".ne-passage").innerText();
      const index = [...text].findIndex((character) => character === "ो" || character === "ौ");
      expect(index > 0, "drill has no ो/ौ to test");
      const chars = [...text];
      const lead = chars.slice(0, index).join("");
      await typeText(page, lead);
      await page.keyboard.press("KeyF"); // ा, first half of ो/ौ
      const pulsing = await page.locator(".ne-passage .animate-pulse").count();
      expect(pulsing >= 1, "no pending preview");
      expect((await typed(page)) === lead, "pending key was committed too early");
      await press(page, chars[index] === "ो" ? { code: "BracketRight" } : { code: "BracketRight", shift: true });
      expect((await typed(page)) === lead + chars[index], "vowel was not composed");
    });

    await check("one Backspace removes a whole conjunct (ज्ञ)", async () => {
      await page.keyboard.press("Digit1"); // ज्ञ in one key
      const before = await typed(page);
      expect(before.endsWith("ज्ञ"), "ज्ञ key did not type three characters");
      await page.keyboard.press("Backspace");
      const after = await typed(page);
      expect(after === before.slice(0, -3), `after backspace: ${JSON.stringify(after.slice(-6))}`);
    });

    await check("Backspace first drops a half-typed vowel", async () => {
      const before = await typed(page);
      await page.keyboard.press("KeyF");
      await page.keyboard.press("Backspace");
      expect((await typed(page)) === before, "text changed");
    });

    await check("Alt layer types फ झ ङ", async () => {
      if ((await page.locator('select[aria-label="Loksewa passage"]').count()) === 0) {
        await page.getByRole("button", { name: /Loksewa typing test/ }).click();
      }
      await page.locator('select[aria-label="Loksewa passage"]').selectOption("0");
      await page.getByRole("button", { name: /Start test/ }).click();
      await page.waitForTimeout(400);
      await focusTyping(page);
      for (const [code, expected] of [["KeyK", "फ"], ["KeyH", "झ"], ["KeyU", "ङ"]]) {
        const before = await typed(page);
        await page.keyboard.down("Alt");
        await page.keyboard.press(code);
        await page.keyboard.up("Alt");
        expect((await typed(page)) === before + expected, `Alt+${code}`);
      }
    });

    await check("no console errors during Nepali typing", async () => {
      const real = errors.filter((message) => !/favicon|manifest/i.test(message));
      expect(real.length === 0, real.join(" | ").slice(0, 1800));
    });

    await check("light theme: Nepali layout renders", async () => {
      await page.getByRole("button", { name: "Toggle theme" }).click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(artifacts, "nepali-light.png") });
    });
    await context.close();
  }

  /* ===== 3. Loksewa verdict (fake clock) ===== */
  console.log("Loksewa test");
  for (const scenario of [
    { name: "passes with enough speed and accuracy", characters: 200, expectText: "Passed", target: 20 },
    { name: "fails when too slow", characters: 12, expectText: "Not yet", target: 30 }
  ]) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-01-01T10:00:00") });
    await openApp(page, { language: "ne" });
    await check(scenario.name, async () => {
      await startLoksewa(page, { passage: 8, seconds: 60, target: scenario.target });
      await focusTyping(page);
      await typeText(page, LOKSEWA_PASSAGES[8].slice(0, scenario.characters));
      await page.clock.runFor(61000);
      await page.waitForSelector('section[aria-label="Loksewa typing test result"]', { timeout: 8000 });
      const card = await page.locator('section[aria-label="Loksewa typing test result"]').innerText();
      expect(card.includes(scenario.expectText), `card says: ${card.replace(/\n/g, " ").slice(0, 120)}`);
    });
    if (scenario.expectText === "Passed") await page.screenshot({ path: join(artifacts, "loksewa-result.png") });
    await context.close();
  }

  /* ===== 4. System keyboard path ===== */
  console.log("System keyboard (text inserted by the OS)");
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await openApp(page, { language: "ne", inputMethod: "system" });
    await check("accepts multi-character text inserted by the keyboard", async () => {
      await startLoksewa(page, { passage: 8, seconds: 300 });
      await focusTyping(page);
      await page.keyboard.insertText("टाइपिङ");
      expect((await typed(page)) === "टाइपिङ", `typed ${JSON.stringify(await typed(page))}`);
      await page.keyboard.insertText(" ");
      expect((await typed(page)) === "टाइपिङ ", "space");
    });
    await context.close();
  }

  /* ===== 5. Phone ===== */
  console.log("Phone");
  {
    const context = await browser.newContext({ ...devices["Pixel 5"] });
    const page = await context.newPage();
    await openApp(page);
    await page.getByRole("button", { name: "नेपाली" }).click();
    await page.waitForTimeout(600);
    await check("defaults to the system keyboard with no on-screen key chart", async () => {
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("typingMaster.languageSettings")));
      expect(saved.inputMethod === "system", `inputMethod is ${saved.inputMethod}`);
      expect((await page.locator('section[aria-label="Nepali keyboard guide"]').count()) === 0, "key chart shown");
    });
    await check("no horizontal overflow on a phone", async () => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow <= 1, `overflow ${overflow}px`);
    });
    await page.screenshot({ path: join(artifacts, "nepali-phone.png") });
    await context.close();
  }

  /* ===== 5b. Lessons: progress and accuracy gating ===== */
  console.log("Lessons");
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await openApp(page, { language: "ne" });
    await page.getByRole("button", { name: /Learn Nepali typing/ }).click();

    await check("only lesson 1 is open at the start", async () => {
      expect(!(await page.getByRole("button", { name: /Home row: left hand/ }).isDisabled()), "lesson 1 is locked");
      expect(await page.getByRole("button", { name: /Home row: right hand/ }).isDisabled(), "lesson 2 is open");
      expect((await page.getByTestId("lesson-count").innerText()).startsWith("0/"), "count is not 0");
    });

    await check("a sloppy run (many wrong keys, then fixed) does not pass", async () => {
      await page.getByRole("button", { name: /Home row: left hand/ }).click();
      await page.waitForTimeout(400);
      await focusTyping(page);
      const text = (await page.locator(".ne-passage").innerText()).replace(/\s+$/, "");
      for (const character of [...text]) {
        if (character !== " ") {
          await page.keyboard.press("Digit6"); // wrong key (ट), then fix it
          await page.keyboard.press("Backspace");
        }
        for (const key of keystrokesFor(character)) await press(page, key);
      }
      await page.waitForSelector('section[aria-label="Nepali lesson result"]', { timeout: 10000 });
      const card = await page.locator('section[aria-label="Nepali lesson result"]').innerText();
      expect(card.includes("Not passed yet"), card.replace(/\n/g, " ").slice(0, 140));
      await page.screenshot({ path: join(artifacts, "lesson-failed.png") });
    });

    await check("a clean run passes, shows the result and unlocks lesson 2", async () => {
      await page.getByRole("button", { name: /Try again/ }).click();
      await page.waitForTimeout(500);
      await focusTyping(page);
      const text = (await page.locator(".ne-passage").innerText()).replace(/\s+$/, "");
      await typeText(page, text);
      await page.waitForSelector('section[aria-label="Nepali lesson result"]', { timeout: 10000 });
      const card = await page.locator('section[aria-label="Nepali lesson result"]').innerText();
      expect(card.includes("Lesson passed"), card.replace(/\n/g, " ").slice(0, 140));
      expect(card.includes("Next lesson"), "no next-lesson button");
      await page.screenshot({ path: join(artifacts, "lesson-passed.png") });
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("typingMaster.nepaliLessons")));
      expect(saved.lessons["home-left"]?.passed === true, "progress not saved");
    });

    await check("progress survives a reload and lesson 2 is open", async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="language-panel"]');
      await page.waitForTimeout(1000);
      await page.getByRole("button", { name: /Learn Nepali typing/ }).click();
      expect(!(await page.getByRole("button", { name: /Home row: right hand/ }).isDisabled()), "lesson 2 still locked");
      expect((await page.getByTestId("lesson-count").innerText()).startsWith("1/"), "count is not 1");
      await page.screenshot({ path: join(artifacts, "lesson-list.png") });
    });

    await check("Unlock all opens every lesson", async () => {
      await page.getByRole("button", { name: "Unlock all" }).click();
      expect(!(await page.getByRole("button", { name: /Everyday words/ }).isDisabled()), "last lesson still locked");
    });
    await context.close();
  }

  /* ===== 5c. Loksewa custom text ===== */
  console.log("Loksewa custom text");
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await openApp(page, { language: "ne" });
    await page.getByRole("button", { name: /Loksewa typing test/ }).click();
    const box = page.getByLabel("Loksewa custom text");

    await check("rejects text that cannot be typed and disables Start", async () => {
      await box.fill("this is not nepali text at all");
      const status = await page.getByTestId("loksewa-custom-status").innerText();
      expect(/Cannot be typed/.test(status), status);
      expect(await page.getByRole("button", { name: /Start test/ }).isDisabled(), "Start is enabled");
    });

    await check("needs at least five words", async () => {
      await box.fill("नेपाल सुन्दर देश");
      expect(/at least 5 words/.test(await page.getByTestId("loksewa-custom-status").innerText()), "no word-count hint");
    });

    await check("types exactly the custom text and finishes", async () => {
      const custom = "नेपाल एक सुन्दर देश हो।";
      await box.fill(`  ${custom}  `);
      await page.getByRole("button", { name: /Start test/ }).click();
      await page.waitForTimeout(500);
      expect((await page.locator(".ne-passage").innerText()).trim() === custom, "passage is not the custom text");
      await focusTyping(page);
      await typeText(page, custom);
      await page.waitForSelector('section[aria-label="Loksewa typing test result"]', { timeout: 10000 });
    });
    await context.close();
  }

  /* ===== 6. Loksewa is cancelled by the top bar ===== */
  console.log("Loksewa cancel");
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await openApp(page, { language: "ne" });
    await check("changing Time in the top bar ends the Loksewa test", async () => {
      await startLoksewa(page, { passage: 8, seconds: 120 });
      expect((await page.getByText(/Loksewa test:/).count()) === 1, "banner missing");
      await page.getByRole("button", { name: "30s", exact: true }).click();
      await page.waitForTimeout(400);
      expect((await page.getByText(/Loksewa test:/).count()) === 0, "Loksewa still active");
    });
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  stop();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
