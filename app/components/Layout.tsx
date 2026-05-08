"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import NotificationPanel from "./NotificationPanel";
import CriticalRiskToast from "./CriticalRiskToast";
import LoadingTransition from "./LoadingTransition";
import {
  HiOutlineViewGrid, HiOutlineShieldExclamation, HiOutlineChartBar,
  HiOutlineUser, HiOutlineCog, HiOutlineNewspaper, HiOutlineAcademicCap,
  HiOutlineBadgeCheck, HiChevronRight, HiOutlineLogout, HiBell,
  HiMenu, HiX, HiOutlineChevronDown,
} from "react-icons/hi";
import {
  MdOutlineAssessment, MdOutlineTrendingUp, MdOutlineInventory2,
} from "react-icons/md";
import { RiShieldKeyholeLine } from "react-icons/ri";

// ── Nav structure ──────────────────────────────────────────────────────────
type SingleItem = { type: "single"; name: string; href: string; icon: React.ReactNode };
type GroupItem = { type: "group"; name: string; icon: React.ReactNode; items: { name: string; href: string }[] };
type NavItem = SingleItem | GroupItem;

const MAIN_NAV: NavItem[] = [
  {
    type: "single",
    name: "Dashboard",
    href: "/dashboard",
    icon: <HiOutlineViewGrid className="w-5 h-5" />,
  },
  {
    type: "group",
    name: "Assessment & Analysis",
    icon: <MdOutlineAssessment className="w-5 h-5" />,
    items: [
      { name: "Questionnaires", href: "/questionnaires" },
      { name: "Risk Evaluation", href: "/risk-evaluation" },
      { name: "Risk Matrix", href: "/risk-matrix" },
      { name: "CVSS Dashboard", href: "/cvss-dashboard" },
      { name: "ALE Analysis", href: "/ale-analysis" },
      { name: "Trend Analysis", href: "/trends" },
    ],
  },
  {
    type: "single",
    name: "Risk Register",
    href: "/risks",
    icon: <HiOutlineShieldExclamation className="w-5 h-5" />,
  },
  {
    type: "single",
    name: "Risk Treatment",
    href: "/risk-treatment",
    icon: <HiOutlineShieldExclamation className="w-5 h-5" />,
  },
  {
    type: "single",
    name: "Assignments",
    href: "/assignments",
    icon: <MdOutlineInventory2 className="w-5 h-5" />,
  },
  {
    type: "single",
    name: "Reports",
    href: "/reports",
    icon: <HiOutlineChartBar className="w-5 h-5" />,
  },
  {
    type: "single",
    name: "Human Awareness",
    href: "/human-awareness",
    icon: <HiOutlineAcademicCap className="w-5 h-5" />,
  },
  {
    type: "group",
    name: "Assets & Threats",
    icon: <RiShieldKeyholeLine className="w-5 h-5" />,
    items: [
      { name: "Asset Inventory", href: "/assets" },
      { name: "Threat Intelligence", href: "/threats" },
    ],
  },
  {
    type: "single",
    name: "Benchmarking",
    href: "/benchmarking",
    icon: <MdOutlineTrendingUp className="w-5 h-5" />,
  },
  {
    type: "single",
    name: "Threat News",
    href: "/performance",
    icon: <HiOutlineNewspaper className="w-5 h-5" />,
  },
];

const SYSTEM_NAV: NavItem[] = [
  {
    type: "single",
    name: "Compliance",
    href: "/certificates",
    icon: <HiOutlineBadgeCheck className="w-5 h-5" />,
  },
  {
    type: "single",
    name: "Profile",
    href: "/profile",
    icon: <HiOutlineUser className="w-5 h-5" />,
  },
];

// ── Sidebar nav item ───────────────────────────────────────────────────────
function NavSingle({ item, pathname, onClose }: { item: SingleItem; pathname: string; onClose: () => void }) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group
        ${active
          ? "bg-blue-50 text-blue-600"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        }`}
    >
      <span className={`${active ? "text-blue-500" : "text-gray-400 group-hover:text-gray-600"} transition-colors`}>
        {item.icon}
      </span>
      {item.name}
      {active && <HiChevronRight className="ml-auto w-4 h-4 text-blue-400" />}
    </Link>
  );
}

function NavGroup({ item, pathname, onClose }: { item: GroupItem; pathname: string; onClose: () => void }) {
  const hasActive = item.items.some(c => pathname === c.href || pathname.startsWith(c.href + "/"));
  const [open, setOpen] = useState(hasActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group
          ${hasActive ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`}
      >
        <span className={`${hasActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-600"} transition-colors`}>
          {item.icon}
        </span>
        <span className="flex-1 text-left">{item.name}</span>
        <HiOutlineChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""} ${hasActive ? "text-blue-400" : "text-gray-300"}`} />
      </button>

      {open && (
        <ul className="mt-1 ml-8 space-y-0.5 border-l-2 border-gray-100 pl-3">
          {item.items.map(sub => {
            const active = pathname === sub.href || pathname.startsWith(sub.href + "/");
            return (
              <li key={sub.href}>
                <Link
                  href={sub.href}
                  onClick={onClose}
                  className={`block px-2 py-2 rounded-lg text-xs font-medium transition-all
                    ${active ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"}`}
                >
                  {sub.name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Collapsed icon-only nav item ──────────────────────────────────────────
function NavSingleCollapsed({ item, pathname }: { item: SingleItem; pathname: string }) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      title={item.name}
      className={`flex items-center justify-center w-10 h-10 rounded-xl mx-auto transition-all
        ${active ? "bg-blue-50 text-blue-500" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}
    >
      {item.icon}
    </Link>
  );
}

function NavGroupCollapsed({ item, pathname }: { item: GroupItem; pathname: string }) {
  const hasActive = item.items.some(c => pathname === c.href || pathname.startsWith(c.href + "/"));
  return (
    <div
      title={item.name}
      className={`flex items-center justify-center w-10 h-10 rounded-xl mx-auto transition-all cursor-default
        ${hasActive ? "bg-blue-50 text-blue-500" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}
    >
      {item.icon}
    </div>
  );
}

// ── Main Layout ────────────────────────────────────────────────────────────
export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/count")
      .then(r => r.json())
      .then(d => setUnreadCount(d.count || 0))
      .catch(() => { });

    if (typeof window === "undefined") return;
    const es = new EventSource("/api/notifications/stream");
    es.addEventListener("notification", () => {
      fetch("/api/notifications/count")
        .then(r => r.json())
        .then(d => setUnreadCount(d.count || 0))
        .catch(() => { });
    });
    return () => es.close();
  }, []);

  const closeMobile = () => setIsMobileOpen(false);

  const allItems = [...MAIN_NAV, ...SYSTEM_NAV];
  const currentPage = allItems.flatMap(i =>
    i.type === "single" ? [{ name: i.name, href: i.href }] : i.items
  ).find(i => pathname === i.href || pathname.startsWith(i.href + "/"))?.name || "Dashboard";

  const userInitial = session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U";
  const userName = session?.user?.name || session?.user?.email || "User";

  const sidebarW = isCollapsed ? "w-16" : "w-64";
  const mainML = isCollapsed ? "lg:ml-16" : "lg:ml-64";

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={closeMobile} />
      )}

      {/* ══ SIDEBAR ══ */}
      <aside className={`
        ${sidebarW} bg-white border-r border-gray-100 flex flex-col
        fixed inset-y-0 left-0 z-50
        transform transition-all duration-300 ease-in-out shadow-lg
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>

        {/* Logo row */}
        <div className={`h-16 flex items-center border-b border-gray-100 shrink-0 overflow-hidden
          ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}>
          {/* Logo image — always visible */}
          <div className="shrink-0 flex items-center justify-center">
            <Image
              src="/logo2.png"
              alt="INSA"
              width={isCollapsed ? 36 : 40}
              height={isCollapsed ? 36 : 40}
              className="object-contain rounded-lg"
              priority
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-gray-800 leading-tight truncate">INSA</p>
              <p className="text-xs text-gray-400 leading-snug truncate" style={{ fontSize: "10px" }}>
                Security Assessment &amp; Analysis
              </p>
            </div>
          )}
        </div>

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {isCollapsed ? (
            /* ── Icon-only mode ── */
            <div className="flex flex-col items-center gap-1 px-3">
              {[...MAIN_NAV, ...SYSTEM_NAV].map(item =>
                item.type === "single"
                  ? <NavSingleCollapsed key={item.name} item={item} pathname={pathname} />
                  : <NavGroupCollapsed key={item.name} item={item} pathname={pathname} />
              )}
            </div>
          ) : (
            /* ── Full mode ── */
            <div className="px-3 space-y-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Main Menu</p>
                <nav className="space-y-0.5">
                  {MAIN_NAV.map(item =>
                    item.type === "single"
                      ? <NavSingle key={item.name} item={item} pathname={pathname} onClose={closeMobile} />
                      : <NavGroup key={item.name} item={item} pathname={pathname} onClose={closeMobile} />
                  )}
                </nav>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">System</p>
                <nav className="space-y-0.5">
                  {SYSTEM_NAV.map(item =>
                    item.type === "single"
                      ? <NavSingle key={item.name} item={item} pathname={pathname} onClose={closeMobile} />
                      : <NavGroup key={item.name} item={item} pathname={pathname} onClose={closeMobile} />
                  )}
                </nav>
              </div>
            </div>
          )}
        </div>

        {/* User strip */}
        {!isCollapsed ? (
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">{userName}</p>
              <p className="text-xs text-gray-400 truncate">{session?.user?.email || ""}</p>
            </div>
          </div>
        ) : (
          <div className="shrink-0 border-t border-gray-100 py-3 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold" title={userName}>
              {userInitial}
            </div>
          </div>
        )}
      </aside>

      {/* ══ MAIN AREA ══ */}
      <div className={`flex-1 flex flex-col ${mainML} min-h-screen transition-all duration-300`}>

        {/* ── Top Header ── */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm">

          {/* Left: hamburger + page title */}
          <div className="flex items-center gap-3">
            {/* Desktop hamburger — toggles collapse */}
            <button
              onClick={() => setIsCollapsed(c => !c)}
              className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? (
                /* three lines → open */
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                /* lines with left arrow → collapse */
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h16" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-3 3 3 3" />
                </svg>
              )}
            </button>

            {/* Mobile hamburger — slides sidebar in/out */}
            <button
              onClick={() => setIsMobileOpen(o => !o)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 transition"
              aria-label="Open menu"
            >
              {isMobileOpen ? (
                <HiX className="w-5 h-5" />
              ) : (
                <HiMenu className="w-5 h-5" />
              )}
            </button>

            {/* Vertical divider */}
            <div className="w-px h-5 bg-gray-200" />

            <h1 className="text-sm font-bold text-gray-800 truncate">{currentPage}</h1>
          </div>

          {/* Right: notifications + sign out */}
          <div className="flex items-center gap-1.5">

            {/* Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(o => !o)}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 transition"
                aria-label="Notifications"
              >
                <HiBell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-11 z-50">
                  <NotificationPanel
                    onClose={() => setShowNotifications(false)}
                    onCountChange={setUnreadCount}
                  />
                </div>
              )}
            </div>

            {/* Unread pill */}
            {unreadCount > 0 && (
              <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount} new
              </span>
            )}

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Sign out */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
            >
              <HiOutlineLogout className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <CriticalRiskToast />
      <LoadingTransition />
    </div>
  );
}
