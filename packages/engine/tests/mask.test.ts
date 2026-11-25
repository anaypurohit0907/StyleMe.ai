import { describe, expect, it } from "vitest";
import { cleanMask } from "../src/mask";

const W = 64;
const H = 64;

function blank(): Float32Array {
  return new Float32Array(W * H);
}

function fill(mask: Float32Array, x0: number, y0: number, x1: number, y1: number, value = 1): void {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) mask[y * W + x] = value;
  }
}

function at(mask: Float32Array, x: number, y: number): number {
  return mask[y * W + x] ?? 0;
}

describe("cleanMask", () => {
  it("keeps the centered garment and drops a border blob", () => {
    const mask = blank();
    fill(mask, 22, 22, 42, 42); // garment
    fill(mask, 0, 0, 10, 10); // bedspread corner
    const out = cleanMask(mask, W, H);
    expect(at(out.mask, 32, 32)).toBe(1);
    expect(at(out.mask, 4, 4)).toBe(0);
    expect(out.keptComponents).toBe(1);
  });

  it("prefers a centered component over a larger border strip", () => {
    const mask = blank();
    fill(mask, 0, 28, 8, 36); // border strip, 64 px
    fill(mask, 28, 28, 36, 36); // centered square, 64 px
    const out = cleanMask(mask, W, H);
    expect(at(out.mask, 32, 32)).toBe(1);
    expect(at(out.mask, 2, 32)).toBe(0);
  });

  it("keeps a nearby detached garment part", () => {
    const mask = blank();
    fill(mask, 18, 18, 42, 42); // body 576
    fill(mask, 44, 24, 52, 32); // sleeve 64, near
    fill(mask, 0, 56, 8, 64); // far border blob
    const out = cleanMask(mask, W, H);
    expect(at(out.mask, 30, 30)).toBe(1);
    expect(at(out.mask, 48, 28)).toBe(1);
    expect(at(out.mask, 4, 60)).toBe(0);
    expect(out.keptComponents).toBe(2);
  });

  it("leaves an empty mask alone", () => {
    const mask = blank();
    const out = cleanMask(mask, W, H);
    expect(out.mask).toBe(mask);
    expect(out.keptArea).toBe(0);
  });

  it("leaves a whole-frame mask alone", () => {
    const mask = blank();
    fill(mask, 0, 0, W, H);
    const out = cleanMask(mask, W, H);
    expect(out.mask).toBe(mask);
  });

  it("ignores sub-threshold pixels", () => {
    const mask = blank();
    fill(mask, 20, 20, 40, 40, 0.4);
    const out = cleanMask(mask, W, H);
    expect(out.mask).toBe(mask);
    expect(out.keptComponents).toBe(0);
  });
});
