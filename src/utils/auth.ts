import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

import env from "../config/env";

export type JwtPayload = {
  userId: number;
  roles: string[];
  permissions: string[];
};

const jwtSecret = env.jwt.secret as Secret;
const jwtExpiresIn = env.jwt.expiresIn as SignOptions["expiresIn"];

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, jwtSecret) as JwtPayload;
};

export const generateNumericOtp = (length = 6): string => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};
