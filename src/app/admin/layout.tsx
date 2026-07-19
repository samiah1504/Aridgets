import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav email={user.email ?? ""}>
        <PushSubscribe />
      </AdminNav>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
