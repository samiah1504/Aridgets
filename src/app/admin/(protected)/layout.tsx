import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import PushSubscribe from "@/components/admin/PushSubscribe";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Crift Admin" },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Crift" },
  other: { "mobile-web-app-capable": "yes" },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaff();

  if (!staff) redirect("/admin/login");

  if (!staff.active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-sm">
          <p className="text-lg font-bold text-gray-900">Account deactivated</p>
          <p className="text-sm text-gray-400 mt-2">
            Your account has been deactivated. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav
        email={staff.email}
        name={staff.fullName}
        roleName={staff.role?.name ?? null}
        permissions={staff.permissions}
      >
        <PushSubscribe />
      </AdminNav>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
