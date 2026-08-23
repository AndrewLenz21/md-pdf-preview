import { authClient } from "@/lib/auth-client";

export async function sendVerificationEmail({
  email,
  locale,
}: {
  email: string;
  locale: string;
}) {
  return authClient.sendVerificationEmail(
    { email, callbackURL: "/" },
    { headers: { "accept-language": locale } },
  );
}
