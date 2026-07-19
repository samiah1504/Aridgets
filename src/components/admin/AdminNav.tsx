"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/leads", label: "Leads" },
];

export default function AdminNav({
  email,
  children,
}: {
  email: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <header className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
        <span className="font-extrabold text-sm tracking-tight shrink-0">
          Crift Shop
        </span>
        <nav className="flex items-center gap-1 flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
                  ? "bg-white/15 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="text-xs text-gray-400 hidden sm:block shrink-0">
          {email}
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
