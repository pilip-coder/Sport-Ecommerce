/// <reference types="node" />

// Ensure this backend-only config remains CommonJS-safe even if tsconfig/module settings change.
// (Avoid using import.meta or other ESM-only features.)

const toPositiveInt = (value: string | undefined, fallback: number): number => {

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const environment = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toPositiveInt(process.env.PORT, 3000),
  databaseHost: process.env.DB_HOST ?? "127.0.0.1",
  databasePort: toPositiveInt(process.env.DB_PORT, 3306),
  databaseUser: process.env.DB_USER ?? "root",
  databasePassword: process.env.DB_PASSWORD ?? "",
  databaseName: process.env.DB_NAME ?? "sport_ecommerce",
  databaseConnectionLimit: toPositiveInt(process.env.DB_CONNECTION_LIMIT, 10),
  jwtSecret: process.env.JWT_SECRET ?? "sport-ecommerce-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
};

export type Environment = typeof environment;
