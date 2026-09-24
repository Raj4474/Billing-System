"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { FileText, LayoutDashboard, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bills", label: "Bills", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-screen print:hidden shadow-sm">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-100 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center mb-2 shadow-sm">
          <FileText className="w-5 h-5" />
        </div>
        <p className="font-bold text-gray-900 text-base uppercase tracking-wide leading-tight">Rupala Enterprise</p>
        <p className="text-xs font-medium text-gray-500 mt-1">Billing System</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-5 border-t border-gray-100">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-semibold text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0 text-red-400" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
