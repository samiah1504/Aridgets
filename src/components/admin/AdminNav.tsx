"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasAnyPerm } from "@/lib/permissions";

const NAV: Array<{ href: string; label: string; perms: string[] | null }> = [
  { href: "/admin", label: "Dashboard", perms: null },
  { href: "/admin/products", label: "Products", perms: ["products.view"] },
  { href: "/admin/leads", label: "Leads", perms: ["leads.view_all", "leads.view_assigned"] },
  { href: "/admin/staff", label: "Staff", perms: ["staff.view"] },
  { href: "/admin/roles", label: "Roles", perms: ["roles.manage"] },
  { href: "/admin/audit", label: "Audit Log", perms: ["audit.view"] },
];

export default function AdminNav({
  email,
  name,
  roleName,
  permissions,
  children,
}: {
  email: string;
  name: string | null;
  roleName: string | null;
  permissions: string[];
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const visible = NAV.filter(
    (item) => item.perms === null || hasAnyPerm(permissions, item.perms)
  );

  return (
    <header className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-4 h-14">
        <span className="font-extrabold text-sm tracking-tight shrink-0">
          Crift Shop
        </span>
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href))
                  ? "bg-white/15 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="text-xs text-gray-400 hidden sm:block shrink-0 text-right leading-tight">
          {name ?? email}
          {roleName && <span className="block text-[10px] text-gray-500">{roleName}</span>}
        </span>
        {children}
        <button
          onClick={signOut}
          className="text-xs text-gray-400 hover:text-white transition shrink-0"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
