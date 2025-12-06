"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu } from "lucide-react";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Page content */}
          <div className="p-8">{children}</div>
        </main>
      </div>
    </ConfirmDialogProvider>
  );
}
