import { authClient } from "@/lib/auth-client";

export type SocialProvider = "google" | "github";

export async function signIn({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  return authClient.signIn.email({ email, password });
}

export async function signInWithSocial({
  provider,
  callbackURL,
}: {
  provider: SocialProvider;
  callbackURL: string;
}) {
  return authClient.signIn.social({ provider, callbackURL });
}
