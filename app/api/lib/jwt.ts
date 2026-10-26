import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@contracts/constants";

export function signToken(payload: object, expiresIn = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): object | string | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
