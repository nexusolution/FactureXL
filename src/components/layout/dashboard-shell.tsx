"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Sidebar } from "./sidebar";
import { Menu, LogOut, Languages } from "lucide-react";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { useLanguage } from "@/lib/i18n";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: session } = useSession();
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "fr" : "en");
  };

  return (
    <ConfirmDialogProvider>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? "w-64" : "w-0"
          } transition-all duration-300 ease-in-out overflow-hidden`}
        >
          <Sidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Top bar with toggle button */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title={sidebarOpen ? "Close menu" : "Open menu"}
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>

            {/* User info, language switcher, and logout */}
            {session?.user && (
              <div className="flex items-center gap-2">
                {/* User info */}
                <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                    {session.user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{session.user.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">{session.user.email}</p>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold text-primary bg-primary/10 rounded">
                        {session.user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Language switcher */}
                <button
                  onClick={toggleLanguage}
                  className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-150 relative"
                  title={t("language")}
                >
                  <Languages className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold text-white bg-primary rounded px-1">
                    {language.toUpperCase()}
                  </span>
                </button>

                {/* Logout */}
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
                  title={t("logout")}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Page content */}
          <div className="p-8">{children}</div>
        </main>
      </div>
    </ConfirmDialogProvider>
  );
}
