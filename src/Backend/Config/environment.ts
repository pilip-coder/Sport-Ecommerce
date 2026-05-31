
export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  databaseHost: string;
  databasePort: number;
  databaseUser: string;
  databasePassword: string;
  databaseName: string;
  databaseConnectionLimit: number;
  databaseSynchronize: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
}

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value == null) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
};

export const environment: EnvironmentConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 3000),
  databaseHost: process.env.DB_HOST ?? "127.0.0.1",
  databasePort: toNumber(process.env.DB_PORT, 3306),
  databaseUser: process.env.DB_USER ?? "root",
  databasePassword: process.env.DB_PASSWORD ?? "",
  databaseName: process.env.DB_NAME ?? "sport_ecommerce",
  databaseConnectionLimit: toNumber(process.env.DB_CONNECTION_LIMIT, 10),
  databaseSynchronize: toBoolean(process.env.DB_SYNCHRONIZE, false),
  jwtSecret: process.env.JWT_SECRET ?? "sport-ecommerce-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
};
