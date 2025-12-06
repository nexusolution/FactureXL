"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  FolderOpen,
  FileX,
  FileCheck,
  CalendarClock,
  Percent,
  Info,
  LogOut,
  Building,
  Banknote,
  Shield,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { useMemo } from "react";

// Navigation items matching Angular role-based structure
const getNavigationByRole = (role: Role | undefined) => {
  if (!role) return [];

  // SUPER_ADMIN Role - only companies and dashboard
  if (role === "SUPER_ADMIN") {
    return [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Companies", href: "/companies", icon: Building },
    ];
  }

  // OWNER Role - full access
  if (role === "OWNER") {
    return [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Clients", href: "/clients", icon: Users },
      { name: "Employés", href: "/employees", icon: UserCog },
      { name: "Utilisateurs", href: "/users", icon: Shield },
      { name: "Groupes", href: "/groups", icon: FolderOpen },
      { name: "Factures", href: "/invoices", icon: FileText },
      { name: "Avoirs", href: "/avoirs", icon: FileX },
      { name: "Devis", href: "/devis", icon: FileCheck },
      { name: "Virements", href: "/transfers", icon: Banknote },
      { name: "Factures abonnements", href: "/subscription-invoices", icon: CalendarClock },
      { name: "Taxes", href: "/taxes", icon: Percent },
      { name: "Informations", href: "/company", icon: Info },
    ];
  }

  // CLIENT Role - limited access
  if (role === "CLIENT") {
    return [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Factures", href: "/invoices", icon: FileText },
      { name: "Informations", href: "/profile", icon: Info },
    ];
  }

  // ADMIN Role - extended access with transfers
  if (role === "ADMIN") {
    return [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Clients", href: "/clients", icon: Users },
      { name: "Employés", href: "/employees", icon: UserCog },
      { name: "Groupes", href: "/groups", icon: FolderOpen },
      { name: "Factures", href: "/invoices", icon: FileText },
      { name: "Avoirs", href: "/avoirs", icon: FileX },
      { name: "Devis", href: "/devis", icon: FileCheck },
      { name: "Virements", href: "/transfers", icon: Banknote },
      { name: "Taxes", href: "/taxes", icon: Percent },
      { name: "Informations", href: "/profile", icon: Info },
    ];
  }

  // MANAGER, EMPLOYEE - invoices, credits, and info
  return [
    { name: "Factures", href: "/invoices", icon: FileText },
    { name: "Avoirs", href: "/avoirs", icon: FileX },
    { name: "Devis", href: "/devis", icon: FileCheck },
    { name: "Informations", href: "/profile", icon: Info },
  ];
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Get navigation items based on user role
  const navigation = useMemo(() => {
    return getNavigationByRole(session?.user?.role);
  }, [session?.user?.role]);

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo - matching Angular style */}
      <div className="flex h-20 items-center justify-center border-b border-gray-200 bg-[#f3f6f9]">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 40 40" className="h-10 w-10">
            <path
              d="M10 5 L30 5 L30 35 L10 35 Z"
              fill="none"
              stroke="hsl(203, 93%, 54%)"
              strokeWidth="3"
            />
            <path
              d="M5 10 L25 10 L25 40 L5 40 Z"
              fill="hsl(203, 93%, 54%)"
              opacity="0.3"
            />
          </svg>
          <span className="text-xl font-semibold text-primary">FactureXL</span>
        </div>
      </div>

      {/* Navigation - matching Angular style with padding */}
      <nav className="flex-1 space-y-1 px-3 py-10 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-6 py-3 text-sm font-medium rounded-lg transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-gray-50 hover:text-primary"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section - matching Angular style */}
      <div className="border-t border-gray-200 p-4 bg-[#f3f6f9]">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {session?.user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.name || "Utilisateur"}
            </p>
            <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            <p className="text-xs text-primary font-medium">{session?.user?.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-2 p-2 text-gray-400 hover:text-primary transition-colors"
            title="Déconnexion"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
