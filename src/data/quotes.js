import { quotesLarge } from "./quotesLarge";

const QUOTE_HISTORY_KEY = "typingMaster.quoteHistory";
const QUOTE_HISTORY_LIMIT = 20;
let lastQuoteInSession = "";

const normalizeQuote = (text) => text.replace(/\s+/g, " ").trim();

const readQuoteHistory = () => {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(QUOTE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeQuote(String(item))).filter(Boolean).slice(0, QUOTE_HISTORY_LIMIT);
  } catch {
    return [];
  }
};

const writeQuoteHistory = (history) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(history.slice(0, QUOTE_HISTORY_LIMIT)));
  } catch {
    // ignore storage failures
  }
};

const rememberQuote = (quote) => {
  const normalized = normalizeQuote(quote);
  if (!normalized) return;
  const current = readQuoteHistory().filter((entry) => entry !== normalized);
  const next = [normalized, ...current].slice(0, QUOTE_HISTORY_LIMIT);
  writeQuoteHistory(next);
  lastQuoteInSession = normalized;
};

const pickNonRepeatingLocalQuote = (exclude = new Set()) => {
  const pool = quotesLarge.map((quote) => normalizeQuote(quote)).filter(Boolean);
  const candidates = pool.filter((quote) => !exclude.has(quote));

  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const fallback = pool[Math.floor(Math.random() * pool.length)] || "Practice with purpose. - GoType";
  if (fallback === lastQuoteInSession && pool.length > 1) {
    const alt = pool.find((quote) => quote !== lastQuoteInSession);
    return alt || fallback;
  }
  return fallback;
};

const fetchWithTimeout = async (url, timeoutMs) => {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getRandomQuote = () => {
  const history = readQuoteHistory();
  const exclude = new Set(history);
  if (lastQuoteInSession) {
    exclude.add(lastQuoteInSession);
  }
  const quote = pickNonRepeatingLocalQuote(exclude);
  rememberQuote(quote);
  return quote;
};

export const fetchRandomQuote = async ({ timeoutMs = 2000 } = {}) => {
  const history = readQuoteHistory();
  const exclude = new Set(history);
  if (lastQuoteInSession) {
    exclude.add(lastQuoteInSession);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout("https://api.quotable.io/random", timeoutMs);
      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      if (!data?.content) {
        continue;
      }

      const formatted = normalizeQuote(`${data.content} - ${data.author || "Unknown"}`);
      if (!formatted || exclude.has(formatted)) {
        continue;
      }

      rememberQuote(formatted);
      return formatted;
    } catch {
      // try fallback below
    }
  }

  const fallback = pickNonRepeatingLocalQuote(exclude);
  rememberQuote(fallback);
  return fallback;
};
