import { authClient } from "@/lib/auth-client";

export async function requestPasswordReset({
  email,
  redirectTo,
  locale,
}: {
  email: string;
  redirectTo: string;
  locale: string;
}) {
  return authClient.requestPasswordReset(
    { email, redirectTo },
    { headers: { "accept-language": locale } },
  );
}
