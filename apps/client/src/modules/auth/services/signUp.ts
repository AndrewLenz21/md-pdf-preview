import { authClient } from "@/lib/auth-client";

export async function signUp({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  return authClient.signUp.email({ name, email, password });
}
