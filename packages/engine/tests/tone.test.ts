import { describe, expect, it } from "vitest";
import { detectTone, toneText, BANKS } from "../src/tone";

describe("detectTone", () => {
  it("detects genz from slang hits", () => {
    const p = detectTone([
      "omg my twin",
      "this outfit is no cap slay",
      "locked in, clock it",
      "bestie it's giving main character",
    ]);
    expect(p.bank).toBe("genz");
    expect(p.intensity).toBeGreaterThan(0);
  });

  it("detects millennial", () => {
    const p = detectTone([
      "honestly obsessed with the aesthetic",
      "vibe check passed",
      "lowkey perfect, no thanks just",
      "main character era, blessed",
    ]);
    expect(p.bank).toBe("millennial");
  });

  it("defaults to none for plain text", () => {
    const p = detectTone(["my name is anay", "i work in an office", "20 pieces"]);
    expect(p.bank).toBe("none");
    expect(p.intensity).toBe(0);
  });

  it("requires at least 2 hits to declare a bank", () => {
    const p = detectTone(["no cap"]);
    expect(p.bank).toBe("none");
  });

  it("matches whole words, not substrings", () => {
    // "bet" inside "better" and "era" inside "general" must not count.
    const p = detectTone(["i feel better", "in general", "the weather"]);
    expect(p.bank).toBe("none");
  });
});

describe("toneText", () => {
  it("every bank covers the same canonical keys", () => {
    const keys = Object.keys(BANKS.genz);
    for (const bank of ["genz", "millennial", "classic"]) {
      for (const k of keys) {
        expect(BANKS[bank]?.[k], `${bank}.${k}`).toBeTruthy();
      }
    }
  });

  it("keeps the bank voice rules from the audit", () => {
    const genz = Object.values(BANKS.genz ?? {}).join(" ").toLowerCase();
    const millennial = Object.values(BANKS.millennial ?? {}).join(" ").toLowerCase();
    // "honestly" is a millennial marker, not genz.
    expect(genz).not.toContain("honestly");
    // Weather copy must differ per bank.
    expect(BANKS.genz?.["weather_line"]).not.toBe(BANKS.millennial?.["weather_line"]);
    // The spec-named genz phrases must actually appear in output copy.
    expect(genz).toContain("twin");
    expect(genz).toContain("clock it");
    // No phrase is recycled within a bank.
    for (const bank of ["genz", "millennial", "classic"]) {
      const values = Object.values(BANKS[bank] ?? {});
      expect(new Set(values).size, `${bank} duplicate copy`).toBe(values.length);
    }
  });

  it("classic profile always returns classic copy", () => {
    const p = detectTone(["plain words only"]);
    expect(toneText("pick_one", p)).toBe(BANKS.classic["pick_one"]);
  });

  it("genz profile returns flavored copy with seeded determinism", () => {
    const p = detectTone(["twin", "no cap", "slay", "bet", "locked in", "bestie"]);
    const a = toneText("pick_one", p, "seed1");
    const b = toneText("pick_one", p, "seed1");
    const c = toneText("pick_one", p, "seed2");
    expect(a).toBe(b); // deterministic per seed
    expect([a, c].some((x) => x === BANKS.genz["pick_one"])).toBe(true);
  });

  it("falls back to the key itself for unknown keys", () => {
    expect(toneText("brand_new_key", { bank: "genz", intensity: 1 })).toBe("brand_new_key");
  });
});
