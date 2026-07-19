import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/admin/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot Password | Crift Admin" };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email and we&apos;ll send a reset link.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
