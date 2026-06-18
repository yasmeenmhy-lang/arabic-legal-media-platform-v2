const requiredNafathVariables = [
  "NAFATH_AUTHORIZATION_URL",
  "NAFATH_CLIENT_ID",
  "NAFATH_CLIENT_SECRET",
  "NAFATH_REDIRECT_URI",
  "NAFATH_TOKEN_URL",
  "NAFATH_USERINFO_URL"
] as const;

export type NafathEnvironmentVariable = (typeof requiredNafathVariables)[number];

export function getNafathConfiguration() {
  const missingVariables = requiredNafathVariables.filter((name) => !process.env[name]?.trim());
  const activationRequested = process.env.NAFATH_ENABLED === "true";

  return {
    enabled: activationRequested && missingVariables.length === 0,
    activationRequested,
    missingVariables,
    authorizationUrl: process.env.NAFATH_AUTHORIZATION_URL?.trim() ?? "",
    clientId: process.env.NAFATH_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.NAFATH_CLIENT_SECRET?.trim() ?? "",
    redirectUri: process.env.NAFATH_REDIRECT_URI?.trim() ?? "",
    tokenUrl: process.env.NAFATH_TOKEN_URL?.trim() ?? "",
    userInfoUrl: process.env.NAFATH_USERINFO_URL?.trim() ?? ""
  };
}
