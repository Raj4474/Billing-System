import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

// Force all protected pages to render dynamically (fresh from DB each request)
// and ensure the cookie-based session is validated server-side on every render.
export const dynamic = "force-dynamic";

const COOKIE_NAME = "re_session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Double-check session server-side in the layout (middleware handles the
  // redirect for unauthenticated users, but this prevents cached renders
  // from leaking authenticated content after logout).
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || !(await verifyToken(token))) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#090d16] text-gray-900 dark:text-gray-100 print:block print:bg-white print:text-black transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 overflow-y-auto print:overflow-visible print:block print:w-full print:p-0">
        {children}
      </main>
    </div>
  );
}
