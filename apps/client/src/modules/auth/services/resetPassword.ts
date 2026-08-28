import { authClient } from "@/lib/auth-client";

export async function resetPassword({
  newPassword,
  token,
}: {
  newPassword: string;
  token: string;
}) {
  return authClient.resetPassword({ newPassword, token });
}
