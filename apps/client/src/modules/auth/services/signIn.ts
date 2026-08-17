import { authClient } from "@/lib/auth-client";

export async function signIn({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  return authClient.signIn.email({ email, password });
}
