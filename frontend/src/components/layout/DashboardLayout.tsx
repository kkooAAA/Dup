"use client";

import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("auth_token");
    if (!token && !user) {
      // router.push("/login");
    }
  }, [user, router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <div className="flex relative">
        {/* Mobile backdrop — sits between navbar and sidebar, closes drawer on tap */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 top-14 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto h-[calc(100vh-56px)] min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
