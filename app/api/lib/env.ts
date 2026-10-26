import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

export const env = {
  appId: process.env.APP_ID ?? (isProduction ? required("APP_ID") : "dev-app"),
  appSecret: process.env.APP_SECRET ?? (isProduction ? required("APP_SECRET") : "dev-secret"),
  isProduction,
  databaseUrl:
    process.env.DATABASE_URL ??
    (isProduction ? required("DATABASE_URL") : "mysql://root:@127.0.0.1:3306/kimi_agent"),
  kimiAuthUrl:
    process.env.KIMI_AUTH_URL ??
    (isProduction ? required("KIMI_AUTH_URL") : "http://localhost:3000/auth"),
  kimiOpenUrl:
    process.env.KIMI_OPEN_URL ??
    (isProduction ? required("KIMI_OPEN_URL") : "http://localhost:3000/open"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};
