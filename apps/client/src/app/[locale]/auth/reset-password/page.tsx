import { AuthPageShell, ResetPasswordForm } from "@/modules/auth";

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const token = getSearchParam(params.token);
  const error = getSearchParam(params.error);

  return (
    <AuthPageShell>
      <ResetPasswordForm
        token={token}
        invalidToken={error === "INVALID_TOKEN"}
      />
    </AuthPageShell>
  );
}
