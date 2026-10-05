import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

const PASSWORD_ROUNDS = env.NODE_ENV === "test" ? 4 : 12;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATIONS";
};

function toPublicUser(user: { id: string; name: string; email: string; role: "ADMIN" | "OPERATIONS" }): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function signToken(user: PublicUser) {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, options);
}

export class AuthService {
  async register(input: { name: string; email: string; password: string }) {
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "CONFLICT", "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email,
        passwordHash,
        role: "OPERATIONS",
      },
    });
    const publicUser = toPublicUser(user);
    return { token: signToken(publicUser), user: publicUser };
  }

  async login(input: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
    }

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
    }

    const publicUser = toPublicUser(user);
    return { token: signToken(publicUser), user: publicUser };
  }
}

export const authService = new AuthService();
