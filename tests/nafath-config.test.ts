import { afterEach, describe, expect, it } from "vitest";
import { getNafathConfiguration } from "@/lib/nafath-config";

const variableNames = [
  "NAFATH_ENABLED",
  "NAFATH_AUTHORIZATION_URL",
  "NAFATH_CLIENT_ID",
  "NAFATH_CLIENT_SECRET",
  "NAFATH_REDIRECT_URI",
  "NAFATH_TOKEN_URL",
  "NAFATH_USERINFO_URL"
] as const;

const originalValues = Object.fromEntries(variableNames.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of variableNames) {
    const value = originalValues[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("Nafath configuration", () => {
  it("stays disabled when official activation is unavailable", () => {
    process.env.NAFATH_ENABLED = "false";
    for (const name of variableNames.slice(1)) delete process.env[name];

    const config = getNafathConfiguration();
    expect(config.enabled).toBe(false);
    expect(config.missingVariables.length).toBeGreaterThan(0);
  });

  it("requires explicit activation and every official variable", () => {
    process.env.NAFATH_ENABLED = "true";
    process.env.NAFATH_AUTHORIZATION_URL = "https://official.example/authorize";
    process.env.NAFATH_CLIENT_ID = "official-id";
    process.env.NAFATH_CLIENT_SECRET = "official-secret";
    process.env.NAFATH_REDIRECT_URI = "https://platform.example/api/auth/nafath/callback";
    process.env.NAFATH_TOKEN_URL = "https://official.example/token";
    process.env.NAFATH_USERINFO_URL = "https://official.example/userinfo";

    expect(getNafathConfiguration().enabled).toBe(true);
    delete process.env.NAFATH_CLIENT_SECRET;
    expect(getNafathConfiguration().enabled).toBe(false);
  });
});
