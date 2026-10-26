import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Shield, Building2, BookOpen,
  GraduationCap, FileBarChart, Menu, X, LogOut,
  BookMarked, Activity, ChevronRight,
  Bell, Search, School,
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
  color: string;
  bgColor: string;
}

const allNavItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard",    icon: LayoutDashboard, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  { path: "/universities", label: "Universities", icon: School,      permission: "universities.view",  color: "text-rose-600",   bgColor: "bg-rose-50" },
  { path: "/users",     label: "Users",        icon: Users,           permission: "users.view",         color: "text-violet-600", bgColor: "bg-violet-50" },
  { path: "/roles",     label: "Roles",        icon: Shield,          permission: "roles.view",         color: "text-purple-600", bgColor: "bg-purple-50" },
  { path: "/colleges",  label: "Colleges",     icon: Building2,       permission: "colleges.view",      color: "text-blue-600",   bgColor: "bg-blue-50" },
  { path: "/courses",   label: "Courses",      icon: BookOpen,        permission: "courses.view",       color: "text-cyan-600",   bgColor: "bg-cyan-50" },
  { path: "/subjects",  label: "Subjects",     icon: BookMarked,      permission: "subjects.view",      color: "text-teal-600",   bgColor: "bg-teal-50" },
  { path: "/students",  label: "Students",     icon: GraduationCap,   permission: "students.view",      color: "text-green-600",  bgColor: "bg-green-50" },
  { path: "/reports",   label: "Reports",      icon: FileBarChart,    permission: "reports.view",       color: "text-orange-600", bgColor: "bg-orange-50" },
  { path: "/activity-logs", label: "Activity", icon: Activity,        permission: "activity_logs.view", color: "text-pink-600",   bgColor: "bg-pink-50" },
];

const studentNavItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  { path: "/students",  label: "My Profile", icon: GraduationCap,  color: "text-green-600",  bgColor: "bg-green-50" },
];

const roleConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  admin:   { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  staff:   { bg: "bg-sky-100",    text: "text-sky-700",    border: "border-sky-200",    dot: "bg-sky-500" },
  student: { bg: "bg-emerald-100",text: "text-emerald-700",border: "border-emerald-200",dot: "bg-emerald-500" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { hasPermission, isAdmin, isStudent } = usePermissions();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = isStudent
    ? studentNavItems
    : allNavItems.filter((item) => {
        if (!item.permission) return true;
        if (isAdmin) return true;
        return hasPermission(item.permission);
      });

  const isActive = (path: string) => {
    if (path === "/students" && location.pathname.startsWith("/student-form")) return true;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const currentNavItem = allNavItems.find(item =>
    location.pathname === item.path || location.pathname.startsWith(item.path + "/")
  ) || allNavItems[0];

  const rc = roleConfig[user?.role ?? "student"] ?? roleConfig.student;
  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100
        flex flex-col shadow-sm
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 group"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="w-9 h-9 stat-indigo rounded-xl flex items-center justify-center shadow-md shadow-indigo-200 group-hover:shadow-indigo-300 transition-shadow">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 leading-tight truncate max-w-[150px]">
                {user?.universityName || "Student Data"}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {user?.universityName ? "Verification Portal" : "Verification System"}
              </p>
            </div>
          </Link>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-gray-500"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-3 mb-3">
            Menu
          </p>

          {navItems.map((item, i) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 animate-slide-in
                  ${active
                    ? `bg-indigo-50 text-indigo-700 border border-indigo-100`
                    : "text-gray-600 hover:bg-slate-50 hover:text-gray-900"
                  }
                `}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                  ${active ? item.bgColor : "bg-slate-100 group-hover:bg-slate-200"}
                `}>
                  <Icon className={`w-4 h-4 ${active ? item.color : "text-slate-500 group-hover:text-slate-700"}`} />
                </div>
                <span className="flex-1">{item.label}</span>
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-100">
          {/* User Info */}
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 transition-colors mb-1">
            <div className="w-9 h-9 rounded-xl stat-indigo flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${rc.bg} ${rc.text} border ${rc.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
                {user?.role?.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-500
              hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ─── Main Area ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="text-slate-400 font-medium">{user?.universityName || "Student Data Verification"}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded ${currentNavItem.bgColor} flex items-center justify-center`}>
                  {(() => { const Icon = currentNavItem.icon; return <Icon className={`w-3 h-3 ${currentNavItem.color}`} />; })()}
                </div>
                <span className="font-semibold text-slate-700">{currentNavItem.label}</span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-400 w-48">
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Quick search...</span>
            </div>
            <button className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 relative">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border border-white" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
              <div className="w-8 h-8 stat-indigo rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name}</p>
                <p className={`text-[10px] font-medium ${rc.text}`}>{user?.role?.toUpperCase()}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="hidden sm:flex gap-1.5 text-xs border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 lg:p-7 animate-fade-in overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
