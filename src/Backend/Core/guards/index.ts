import { createHmac, timingSafeEqual } from "node:crypto";

import { NextFunction, Request, Response } from "express";

import { environment } from "../../Config/environment";
import { AppError } from "../errors";

interface JwtPayload {
  sub: number | string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  authUser?: {
    userId: number;
    email: string;
    role: string;
  };
}

const decodeBase64Url = (value: string): string => {
  return Buffer.from(value, "base64url").toString("utf8");
};

const parseBearerToken = (authorization: string | undefined): string => {
  if (!authorization) {
    throw new AppError("Authorization header is required.", 401);
  }

  const [scheme, token] = authorization.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    throw new AppError("Authorization must use Bearer token.", 401);
  }

  return token;
};

const verifyToken = (token: string): JwtPayload => {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    throw new AppError("Invalid access token format.", 401);
  }

  const expectedSignature = createHmac("sha256", environment.jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new AppError("Invalid access token signature.", 401);
  }

  let parsed: JwtPayload;
  try {
    parsed = JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  } catch {
    throw new AppError("Invalid access token payload.", 401);
  }

  if (!parsed.sub || !parsed.email || !parsed.role || !parsed.exp) {
    throw new AppError("Access token is missing required claims.", 401);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (parsed.exp <= nowSeconds) {
    throw new AppError("Access token has expired.", 401);
  }

  const userId = Number(parsed.sub);
  if (!Number.isInteger(userId) || userId < 1) {
    throw new AppError("Invalid access token subject.", 401);
  }

  return parsed;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = parseBearerToken(req.headers.authorization);
    const payload = verifyToken(token);

    (req as AuthenticatedRequest).authUser = {
      userId: Number(payload.sub),
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    res.status(401).json({ message: "Unauthorized." });
    return;
  }
};

export const requireRoles = (...roles: string[]) => {
  const allowed = new Set(roles.map((role) => role.trim().toLowerCase()));

  return (req: Request, res: Response, next: NextFunction): void => {
    const authUser = (req as AuthenticatedRequest).authUser;
    if (!authUser) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!allowed.has(authUser.role.trim().toLowerCase())) {
      res.status(403).json({ message: "Forbidden. Insufficient permissions." });
      return;
    }

    next();
  };
};
