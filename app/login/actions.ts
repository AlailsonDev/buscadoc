"use server";

import { signIn, signOut } from "@/auth";

export async function loginWith(provider: "google" | "microsoft") {
  await signIn(provider, { redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
