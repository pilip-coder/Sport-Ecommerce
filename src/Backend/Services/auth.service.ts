import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { environment } from "../Config/environment";


import { AppError } from "../Core/errors";
import type { LoginDto, RegisterDto } from "../dto/auth";
import type { AuthUserResponse, UserEntity } from "../Models/user.model";
import { createUser, findUserByEmail } from "../Repositories/auth.repository";

const scrypt = promisify(scryptCallback);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const toAuthUserResponse = (user: UserEntity): AuthUserResponse => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  phone: user.phone,
  roleName: user.roleName,
});

const validateRegisterPayload = (payload: RegisterDto): void => {
  if (!payload.fullName || payload.fullName.trim().length < 2) {
    throw new AppError("Full name must be at least 2 characters.", 400);
  }

  if (!EMAIL_PATTERN.test(payload.email)) {
    throw new AppError("A valid email is required.", 400);
  }

  if (!payload.password || payload.password.length < 6) {
    throw new AppError("Password must be at least 6 characters.", 400);
  }
};

const validateLoginPayload = (payload: LoginDto): void => {
  if (!EMAIL_PATTERN.test(payload.email)) {
    throw new AppError("A valid email is required.", 400);
  }

  if (!payload.password) {
    throw new AppError("Password is required.", 400);
  }
};

const createPasswordHash = async (rawPassword: string): Promise<string> => {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(rawPassword, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
};

const verifyPassword = async (rawPassword: string, storedHash: string): Promise<boolean> => {
  const [salt, key] = storedHash.split(":");

  if (!salt || !key) {
    return false;
  }

  const derived = (await scrypt(rawPassword, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(key, "hex");

  if (storedBuffer.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derived);
};

const encodeBase64Url = (value: string): string => Buffer.from(value).toString("base64url");

const parseJwtExpirySeconds = (value: string): number => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)([smhd])?$/i);

  if (!match) {
    return 24 * 60 * 60;
  }

  const amount = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();

  if (unit === "m") {
    return amount * 60;
  }
  if (unit === "h") {
    return amount * 60 * 60;
  }
  if (unit === "d") {
    return amount * 24 * 60 * 60;
  }

  return amount;
};

const createAccessToken = (user: UserEntity): string => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresInSeconds = parseJwtExpirySeconds(environment.jwtExpiresIn);

  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.roleName,
      iat: nowSeconds,
      exp: nowSeconds + expiresInSeconds,
    }),
  );

  const signature = createHmac("sha256", environment.jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
};

export interface AuthResult {
  user: AuthUserResponse;
  accessToken: string;
}

export const registerUser = async (payload: RegisterDto): Promise<AuthResult> => {
  validateRegisterPayload(payload);

  const email = normalizeEmail(payload.email);
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new AppError("Email is already registered.", 409);
  }

  const passwordHash = await createPasswordHash(payload.password);

  const createdUser = await createUser({
    email,
    fullName: payload.fullName.trim(),
    passwordHash,
    phone: payload.phone?.trim() || null,
    roleName: payload.roleName?.trim() || "customer",
  });

  return {
    user: toAuthUserResponse(createdUser),
    accessToken: createAccessToken(createdUser),
  };
};

export const loginUser = async (payload: LoginDto): Promise<AuthResult> => {
  validateLoginPayload(payload);

  const email = normalizeEmail(payload.email);
  const existingUser = await findUserByEmail(email);

  if (!existingUser) {
    throw new AppError("Invalid email or password.", 401);
  }

  const passwordMatches = await verifyPassword(payload.password, existingUser.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password.", 401);
  }

  return {
    user: toAuthUserResponse(existingUser),
    accessToken: createAccessToken(existingUser),
  };
};
