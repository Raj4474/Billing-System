import Sidebar from "@/components/Sidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 print:block print:bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto print:overflow-visible print:block print:w-full print:p-0">
        {children}
      </main>
    </div>
  );
}
