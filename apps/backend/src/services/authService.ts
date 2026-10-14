import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { RegisterRequest } from "@tiendadcc/utils";
import { ConflictError } from "../errors.ts";
import { User, type UserDocument } from "../models/User.ts";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = "7d";
const DUMMY_HASH = "$2b$10$CEgUpVk66dB5H0bpEd8cb.doyRdtSccYxKtI87rl./7wBgxrDTj7i";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(userId: string, secret: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string, secret: string): string | null {
  try {
    const payload = jwt.verify(token, secret);
    if (
      typeof payload === "object" &&
      payload !== null &&
      typeof payload.sub === "string"
    ) {
      return payload.sub;
    }
    return null;
  } catch {
    return null;
  }
}

export async function createUser(
  input: RegisterRequest,
): Promise<UserDocument> {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new ConflictError();
  }
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    throw new ConflictError("Ese nombre de usuario ya está en uso.");
  }

  const passwordHash = await hashPassword(input.password);
  return User.create({
    username,
    displayName: input.displayName.trim(),
    email,
    passwordHash,
  });
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<UserDocument | null> {
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  return isValid ? user : null;
}

export async function findUserById(id: string): Promise<UserDocument | null> {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }
  return User.findById(id);
}
