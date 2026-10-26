import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { trpc } from "@/providers/trpc";
import {
  Building2, BookOpen, BookMarked, GraduationCap,
  Users, FileCheck, TrendingUp, Activity, ArrowUpRight,
  Calendar, Shield, ChevronRight, Sparkles,
} from "lucide-react";

// ─── Skeleton ───
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// ─── Stat Card ───
function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  change,
  to,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  gradient: string;
  change?: string;
  to: string;
}) {
  return (
    <Link to={to} className="group">
      <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-200 relative overflow-hidden">
        {/* Background decoration */}
        <div className={`absolute -right-4 -top-4 w-20 h-20 ${gradient} rounded-full opacity-10 group-hover:opacity-15 transition-opacity`} />
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 ${gradient} rounded-xl flex items-center justify-center shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
        <div>
          {value === undefined ? (
            <>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-20" />
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-slate-800 tabular-nums">{value.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-0.5">{label}</p>
              {change && (
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {change}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Quick Action ───
function QuickAction({
  icon: Icon,
  label,
  description,
  to,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  to: string;
  color: string;
  bg: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white
        hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 transition-all duration-200"
    >
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}

const statConfig = [
  { key: "colleges",       label: "Colleges",         icon: Building2,    gradient: "stat-blue",   change: "Active institutions", to: "/colleges" },
  { key: "courses",        label: "Courses",          icon: BookOpen,     gradient: "stat-green",  change: "Across all colleges",  to: "/courses" },
  { key: "subjects",       label: "Subjects",         icon: BookMarked,   gradient: "stat-purple", change: "Total subjects",       to: "/subjects" },
  { key: "students",       label: "Students",         icon: GraduationCap,gradient: "stat-orange", change: "Enrolled students",    to: "/students" },
  { key: "users",          label: "Staff Users",      icon: Users,        gradient: "stat-pink",   change: "System users",        to: "/users" },
  { key: "finalSubmitted", label: "Final Submitted",  icon: FileCheck,    gradient: "stat-teal",   change: "Forms submitted",     to: "/reports" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();

  const { data: stats, isLoading } = trpc.report.dashboardStats.useQuery(undefined, {
    enabled: isAdmin,
  });

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-7 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome back, {user?.name?.split(" ")[0] ?? "User"}!
            </h1>
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            isAdmin
              ? "bg-violet-50 text-violet-700 border-violet-200"
              : user?.role === "staff"
              ? "bg-sky-50 text-sky-700 border-sky-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            <Shield className="w-3 h-3" />
            {user?.role?.toUpperCase()} ACCESS
          </div>
        </div>
      </div>

      {/* ─── Admin Stats Grid ─── */}
      {isAdmin && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {statConfig.map((card) => (
              <StatCard
                key={card.key}
                icon={card.icon}
                label={card.label}
                value={isLoading ? undefined : (stats?.[card.key as keyof typeof stats] as number)}
                gradient={card.gradient}
                change={card.change}
                to={card.to}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Recent Students + Quick Actions ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Students */}
        {isAdmin && (
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 stat-orange rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">Recent Students</h3>
                </div>
                <Link to="/students" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {isLoading ? (
                <div className="p-5 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentStudents?.length ? (
                <div className="divide-y divide-slate-50">
                  {stats.recentStudents.map((s: any, i: number) => (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: ["#6366f1","#3b82f6","#10b981","#f59e0b","#ec4899"][i % 5] }}>
                        {s.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                        <p className="text-xs text-slate-400 truncate">{s.rollNumber} · {s.collegeName}</p>
                      </div>
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 text-center">
                  <GraduationCap className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-500">No students found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className={isAdmin ? "" : "lg:col-span-3"}>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-50">
              <div className="w-7 h-7 stat-indigo rounded-lg flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              {(isAdmin || hasPermission("students.view")) && (
                <QuickAction icon={GraduationCap} label="Students" description="Manage student records" to="/students" color="text-orange-600" bg="bg-orange-50" />
              )}
              {(isAdmin || hasPermission("colleges.view")) && (
                <QuickAction icon={Building2} label="Colleges" description="View & manage colleges" to="/colleges" color="text-blue-600" bg="bg-blue-50" />
              )}
              {(isAdmin || hasPermission("courses.view")) && (
                <QuickAction icon={BookOpen} label="Courses" description="Browse course catalog" to="/courses" color="text-green-600" bg="bg-green-50" />
              )}
              {(isAdmin || hasPermission("reports.view")) && (
                <QuickAction icon={FileCheck} label="Reports" description="View system reports" to="/reports" color="text-teal-600" bg="bg-teal-50" />
              )}
              {isAdmin && (
                <>
                  <QuickAction icon={Users} label="Users" description="Manage staff accounts" to="/users" color="text-violet-600" bg="bg-violet-50" />
                  <QuickAction icon={Shield} label="Roles" description="Configure permissions" to="/roles" color="text-purple-600" bg="bg-purple-50" />
                </>
              )}
            </div>
          </div>

          {/* User Info Card */}
          <div className="mt-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Account Details</p>
                <p className="text-indigo-200 text-xs">Your profile information</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-200">User ID</span>
                <span className="font-semibold font-mono text-xs bg-white/15 px-2 py-0.5 rounded-lg">{user?.userId}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-200">Role</span>
                <span className="font-semibold capitalize bg-white/15 px-2 py-0.5 rounded-lg text-xs">{user?.role}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-200">Email</span>
                <span className="font-medium text-xs truncate max-w-32">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Student Dashboard ─── */}
      {user?.role === "student" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
            <h3 className="font-bold text-lg mb-2">📋 My Profile</h3>
            <p className="text-indigo-100 text-sm mb-4">Access and update your personal information</p>
            <Link to="/students" className="inline-flex items-center gap-1.5 bg-white text-indigo-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors">
              View Profile <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
            <h3 className="font-bold text-lg mb-2">📄 My Documents</h3>
            <p className="text-emerald-100 text-sm mb-4">Upload and manage your required documents</p>
            <Link to="/student-form" className="inline-flex items-center gap-1.5 bg-white text-emerald-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors">
              Manage Docs <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
