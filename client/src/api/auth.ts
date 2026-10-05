import type { User } from "../types";
import { api } from "./client";

export function login(input: { email: string; password: string }) {
  return api<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function register(input: { name: string; email: string; password: string }) {
  return api<{ token: string; user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchMe() {
  return api<{ user: User }>("/auth/me");
}
