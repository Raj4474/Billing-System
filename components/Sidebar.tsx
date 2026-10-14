"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { FileText, LayoutDashboard, Settings, LogOut, Package } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bills", label: "Bills", icon: FileText },
  { href: "/products", label: "Products", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-white dark:bg-[#0f172a] border-r border-gray-200 dark:border-gray-800/80 flex flex-col min-h-screen print:hidden shadow-sm transition-colors duration-200">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-100 dark:border-gray-800/80 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-2 shadow-md shadow-blue-500/20">
          <FileText className="w-5 h-5" />
        </div>
        <p className="font-bold text-gray-900 dark:text-gray-100 text-base uppercase tracking-wide leading-tight">
          Billing System
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? "text-white" : "text-gray-400 dark:text-gray-500"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Controls: Theme Toggle & Logout */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800/80 space-y-2">
        <ThemeToggle variant="row" />

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5 shrink-0 text-red-400 dark:text-red-400" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
