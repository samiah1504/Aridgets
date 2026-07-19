import type { Metadata } from "next";
import ResetPasswordForm from "@/components/admin/ResetPasswordForm";

export const metadata: Metadata = { title: "Set New Password | Crift Admin" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const code = typeof sp.code === "string" ? sp.code : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Set new password</h1>
        <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>
        <ResetPasswordForm code={code} />
      </div>
    </div>
  );
}
