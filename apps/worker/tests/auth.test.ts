import { describe, expect, it } from "vitest";
import { mintToken, verifyToken } from "../src/auth";

const SECRET = "unit-test-secret-0123456789";

describe("device JWT", () => {
  it("round-trips a device id", async () => {
    const t = await mintToken(SECRET, "device-abc-123");
    const sub = await verifyToken(SECRET, t);
    expect(sub).toBe("device-abc-123");
  });

  it("rejects tokens from a different secret", async () => {
    const t = await mintToken(SECRET, "device-abc-123");
    expect(await verifyToken("other-secret-01234567890", t)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyToken(SECRET, "not.a.jwt")).toBeNull();
  });
});
