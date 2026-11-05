import { memo, useEffect, useMemo, useState } from "react";
import { DECOMPOSITION, FINGERS, KEY_ROWS, LANGUAGES, getLayout, keyForText } from "../data/keyboardLayouts";

/* One colour per finger, shared by the keys and the hands so the eye can match them. */
const FINGER_COLORS = {
  LP: "#e0655c", RP: "#e0655c",
  LR: "#ddbf84", RR: "#ddbf84",
  LM: "#a8a0e3", RM: "#a8a0e3",
  LI: "#6fc3a3", RI: "#6fc3a3",
  LT: "#9fa3cc", RT: "#9fa3cc"
};

const ALT_COLOR = "#f0a35e";
const LEADING_MARK = /^\p{M}/u;
const DEVANAGARI = /[ऀ-ॿ]/;
const PLACEHOLDER = "◌"; // dotted circle: lets a lone vowel sign be seen on a key

const showGlyph = (text) => (text && LEADING_MARK.test(text) ? `${PLACEHOLDER}${text}` : text);

/* flex-grow units so every row adds up to 15 and the board stays aligned */
const ROW_SHAPE = [
  { lead: null, trail: { label: "Backspace", grow: 2 }, grows: {} },
  { lead: { label: "Tab", grow: 1.5 }, trail: null, grows: { Backslash: 1.5 } },
  { lead: { label: "Caps", grow: 1.75 }, trail: { label: "Enter", grow: 2.25 }, grows: {} },
  { lead: { code: "ShiftLeft", label: "Shift", grow: 2.25 }, trail: { code: "ShiftRight", label: "Shift", grow: 2.75 }, grows: {} }
];

function Key({ code, grow = 1, finger, tint, primary, secondary, alt, latin, state, isDark, isModifier, label }) {
  const color = finger ? FINGER_COLORS[finger] : null;
  const isTarget = state === "target";
  const isHit = state === "hit";
  const isMiss = state === "miss";
  const isAltTarget = isTarget && code?.startsWith("Alt");

  let background;
  if (isAltTarget) background = ALT_COLOR;
  else if (isTarget) background = color || (isDark ? "#8d86d6" : "#6f69bf");
  else if (isHit) background = "#34d399";
  else if (isMiss) background = "#f43f5e";
  else if (tint && color) background = `${color}${isDark ? "26" : "33"}`;
  else background = isDark ? "rgba(148,163,184,0.10)" : "rgba(15,23,42,0.05)";

  const textColor = isTarget || isHit || isMiss ? "#0c0d24" : isDark ? "#eaedfe" : "#1f2048";
  const glow = isAltTarget ? ALT_COLOR : color || "#8d86d6";

  return (
    <div
      data-key={code}
      style={{
        flexGrow: grow,
        flexBasis: 0,
        background,
        color: textColor,
        boxShadow: isTarget
          ? `0 0 0 2px ${isDark ? "#fff" : "#2a2a55"}, 0 0 18px ${glow}`
          : `inset 0 -2px 0 ${isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)"}`
      }}
      className={`relative flex h-9 min-w-0 select-none items-center justify-center rounded-md text-center transition-[background,box-shadow,transform] duration-100 sm:h-11 md:h-12 ${
        isTarget ? "z-10 scale-105 animate-pulse" : ""
      } ${isHit || isMiss ? "scale-95" : ""}`}
    >
      {isModifier ? (
        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70 sm:text-[10px]">{label}</span>
      ) : (
        <>
          <span
            className={`font-semibold leading-none ${primary && primary.length > 2 ? "text-sm sm:text-base" : "text-base sm:text-xl"}`}
            lang={primary && DEVANAGARI.test(primary) ? "ne" : undefined}
          >
            {primary}
          </span>
          {secondary ? (
            <span
              className="absolute right-1 top-0.5 text-[9px] leading-none opacity-75 sm:text-[11px]"
              lang={DEVANAGARI.test(secondary) ? "ne" : undefined}
            >
              {secondary}
            </span>
          ) : null}
          {alt ? (
            <span
              className="absolute bottom-0.5 right-1 text-[9px] font-bold leading-none sm:text-[11px]"
              style={{ color: isTarget ? "#0c0d24" : ALT_COLOR }}
              lang="ne"
              title="Alt + key"
            >
              {alt}
            </span>
          ) : null}
          {latin ? (
            <span className="absolute bottom-0.5 left-1 text-[8px] font-medium leading-none opacity-45 sm:text-[9px]">{latin}</span>
          ) : null}
        </>
      )}
    </div>
  );
}

/* A very small pair of hands; the finger to press lights up. */
function Hands({ activeFingers, isDark }) {
  const idle = isDark ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.10)";
  const fingerShape = (id, x, height) => {
    const active = activeFingers.includes(id);
    const color = FINGER_COLORS[id];
    return (
      <rect
        key={id}
        x={x}
        y={60 - height}
        width="16"
        height={height + 14}
        rx="8"
        fill={active ? color : idle}
        stroke={active ? (isDark ? "#fff" : "#2a2a55") : color}
        strokeOpacity={active ? 1 : 0.55}
        strokeWidth={active ? 2 : 1.2}
        className={active ? "animate-pulse" : ""}
      />
    );
  };

  const palm = (x) => <rect x={x} y="52" width="84" height="44" rx="20" fill={isDark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.06)"} />;

  return (
    <svg viewBox="0 0 400 110" className="mx-auto h-28 w-full max-w-md sm:h-36" role="img" aria-label="Hands with the finger to use highlighted">
      <g>
        {palm(20)}
        {fingerShape("LP", 22, 26)}
        {fingerShape("LR", 42, 38)}
        {fingerShape("LM", 62, 44)}
        {fingerShape("LI", 82, 36)}
        <rect
          x="104" y="64" width="22" height="16" rx="8" transform="rotate(25 104 64)"
          fill={activeFingers.includes("LT") ? FINGER_COLORS.LT : idle}
          stroke={FINGER_COLORS.LT} strokeOpacity={activeFingers.includes("LT") ? 1 : 0.55} strokeWidth="1.5"
        />
      </g>
      <g>
        {palm(296)}
        {fingerShape("RI", 298, 36)}
        {fingerShape("RM", 318, 44)}
        {fingerShape("RR", 338, 38)}
        {fingerShape("RP", 358, 26)}
        <rect
          x="274" y="64" width="22" height="16" rx="8" transform="rotate(-25 296 64)"
          fill={activeFingers.includes("RT") ? FINGER_COLORS.RT : idle}
          stroke={FINGER_COLORS.RT} strokeOpacity={activeFingers.includes("RT") ? 1 : 0.55} strokeWidth="1.5"
        />
      </g>
      <text x="62" y="106" textAnchor="middle" fontSize="10" fill={isDark ? "#9fa3cc" : "#4f5380"}>Left</text>
      <text x="338" y="106" textAnchor="middle" fontSize="10" fill={isDark ? "#9fa3cc" : "#4f5380"}>Right</text>
    </svg>
  );
}

const lower = (text) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : "");

function KeyboardGuide({
  language = LANGUAGES.NE,
  upcomingText = "",
  nextCharacter = "",
  pressed = null,
  showKeyboard = true,
  showFingerHints = true,
  isDark = true,
  isFinished = false
}) {
  const layout = useMemo(() => getLayout(language), [language]);
  const target = useMemo(() => (isFinished ? null : keyForText(layout, upcomingText)), [layout, upcomingText, isFinished]);

  // brief hit/miss flash on the key the user just pressed
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (!pressed) return undefined;
    setFlash(pressed);
    const timer = window.setTimeout(() => setFlash(null), 140);
    return () => window.clearTimeout(timer);
  }, [pressed]);

  if (!showKeyboard && !showFingerHints) return null;

  const stateFor = (code) => {
    if (flash && flash.code === code) return flash.ok ? "hit" : "miss";
    if (target && (target.code === code || target.shiftCode === code || target.altCode === code)) return "target";
    return "idle";
  };

  const activeFingers = target ? [target.finger, target.shiftFinger, target.altFinger].filter(Boolean) : [];
  const first = upcomingText ? upcomingText[0] : "";
  const nextIsSpace = first === " ";
  const unmapped = Boolean(first) && !target && !isFinished;
  const output = target?.output || "";
  const composed = nextCharacter && DECOMPOSITION[nextCharacter] ? nextCharacter : "";

  const hintLine = (() => {
    if (!upcomingText || isFinished) return "Start typing: your first key begins the test.";
    if (unmapped) return `“${first}” is not on this layout.`;
    if (nextIsSpace) return "Space bar · either thumb";
    const keyInfo = KEY_ROWS.flat().find(([code]) => code === target.code);
    const keyName = keyInfo ? keyInfo[2] : target.code;
    const finger = lower(FINGERS[target.finger]?.label);
    const extra = output.length > 1 ? ` (types ${output})` : "";
    if (target.alt) {
      return `Hold Alt with your ${lower(FINGERS[target.altFinger].label)}, press ${keyName} with your ${finger}${extra}`;
    }
    if (target.shift) {
      return `Hold Shift with your ${lower(FINGERS[target.shiftFinger].label)}, press ${keyName} with your ${finger}${extra}`;
    }
    return `Press ${keyName} with your ${finger}${extra}`;
  })();

  const rowKeys = (rowIndex) => {
    const shape = ROW_SHAPE[rowIndex];
    return KEY_ROWS[rowIndex].map(([code, finger, latin]) => {
      const pair = layout.byCode[code];
      const isNepali = language === LANGUAGES.NE;
      const primaryRaw = pair ? pair.normal : latin;
      const secondaryRaw = pair ? pair.shifted : "";
      return (
        <Key
          key={code}
          code={code}
          grow={shape.grows[code] || 1}
          finger={finger}
          tint
          primary={isNepali ? showGlyph(primaryRaw) : /[a-z]/i.test(latin) ? latin : primaryRaw}
          secondary={isNepali ? showGlyph(secondaryRaw) : /[a-z]/i.test(latin) ? "" : secondaryRaw}
          alt={isNepali && pair?.alt ? pair.alt : ""}
          latin={isNepali && /[A-Z]/.test(latin) ? latin : ""}
          state={stateFor(code)}
          isDark={isDark}
        />
      );
    });
  };

  const edge = (spec, rowIndex) => {
    if (!spec) return null;
    const code = spec.code;
    return (
      <Key
        code={code || spec.label}
        grow={spec.grow}
        label={spec.label}
        isModifier
        finger={code === "ShiftLeft" ? "LP" : code === "ShiftRight" ? "RP" : null}
        tint={Boolean(code)}
        state={code ? stateFor(code) : "idle"}
        isDark={isDark}
        key={`${rowIndex}-${code || spec.label}`}
      />
    );
  };

  const bigGlyph = nextIsSpace ? "␣" : output ? showGlyph(output) : first ? showGlyph(first) : "–";

  return (
    <section
      aria-label={language === LANGUAGES.NE ? "Nepali keyboard guide" : "Keyboard guide"}
      className={`rounded-3xl border p-4 sm:p-5 ${isDark ? "border-slate-700/70 bg-slate-950/50" : "border-slate-200 bg-white/90"}`}
    >
      {showFingerHints ? (
        <div className="mb-3 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 min-w-12 items-center justify-center rounded-xl px-3 text-2xl font-semibold sm:text-3xl ${isDark ? "bg-slate-900 text-slate-50" : "bg-slate-100 text-slate-900"}`}
              lang={language === LANGUAGES.NE ? "ne" : "en"}
              aria-label="Next key output"
            >
              {bigGlyph}
            </div>
            <div className="text-left">
              <p className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`} aria-live="polite">{hintLine}</p>
              {composed ? (
                <p className="mt-0.5 text-xs text-slate-400" lang="ne">
                  {showGlyph(composed)} is typed as {[...DECOMPOSITION[composed]].map((part) => showGlyph(part)).join(" + ")}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {[["LP", "Pinky"], ["LR", "Ring"], ["LM", "Middle"], ["LI", "Index"], ["LT", "Thumb"]].map(([id, name]) => (
              <span key={id} className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: FINGER_COLORS[id] }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {showKeyboard ? (
        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-1 sm:gap-1.5">
          {[0, 1, 2, 3].map((rowIndex) => (
            <div key={rowIndex} className="flex gap-1 sm:gap-1.5">
              {edge(ROW_SHAPE[rowIndex].lead, rowIndex)}
              {rowKeys(rowIndex)}
              {edge(ROW_SHAPE[rowIndex].trail, rowIndex)}
            </div>
          ))}
          <div className="flex gap-1 sm:gap-1.5">
            <div style={{ flexGrow: 3, flexBasis: 0 }} />
            <Key code="AltLeft" grow={1.5} label="Alt" isModifier finger="LT" tint={language === LANGUAGES.NE} state={stateFor("AltLeft")} isDark={isDark} />
            <Key code="Space" grow={6} label="Space" isModifier finger="RT" tint state={stateFor("Space")} isDark={isDark} />
            <Key code="AltRight" grow={1.5} label="Alt" isModifier finger="RT" tint={language === LANGUAGES.NE} state={stateFor("AltRight")} isDark={isDark} />
            <div style={{ flexGrow: 3, flexBasis: 0 }} />
          </div>
        </div>
      ) : null}

      {showFingerHints ? <Hands activeFingers={activeFingers} isDark={isDark} /> : null}

      {language === LANGUAGES.NE && showKeyboard ? (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Big letter: normal press · small letter, top right: with Shift · <span style={{ color: ALT_COLOR }}>orange letter</span>: with Alt (extra letters) · tiny letter: the key on an English keyboard
        </p>
      ) : null}
    </section>
  );
}

export default memo(KeyboardGuide);
