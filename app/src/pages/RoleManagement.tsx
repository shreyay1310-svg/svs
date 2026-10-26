import { useState } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search, Plus, Pencil, Power, Trash2, Download, X, UploadCloud,
  Shield, Users, Building2, BookOpen, BookMarked, GraduationCap,
  FileBarChart, Settings, Activity, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

// ─── Permission Categories ───
const permissionCategories = [
  {
    key: "users",
    label: "User Management",
    icon: Users,
    color: "violet",
    perms: [
      { key: "users.view", label: "View Users" },
      { key: "users.create", label: "Create Users" },
      { key: "users.edit", label: "Edit Users" },
      { key: "users.delete", label: "Delete Users" },
    ],
  },
  {
    key: "roles",
    label: "Role Management",
    icon: Shield,
    color: "purple",
    perms: [
      { key: "roles.view", label: "View Roles" },
      { key: "roles.create", label: "Create Roles" },
      { key: "roles.edit", label: "Edit Roles" },
      { key: "roles.delete", label: "Delete Roles" },
    ],
  },
  {
    key: "colleges",
    label: "College Management",
    icon: Building2,
    color: "blue",
    perms: [
      { key: "colleges.view", label: "View Colleges" },
      { key: "colleges.create", label: "Create Colleges" },
      { key: "colleges.edit", label: "Edit Colleges" },
      { key: "colleges.delete", label: "Delete Colleges" },
    ],
  },
  {
    key: "courses",
    label: "Course Management",
    icon: BookOpen,
    color: "cyan",
    perms: [
      { key: "courses.view", label: "View Courses" },
      { key: "courses.create", label: "Create Courses" },
      { key: "courses.edit", label: "Edit Courses" },
      { key: "courses.delete", label: "Delete Courses" },
    ],
  },
  {
    key: "subjects",
    label: "Subject Management",
    icon: BookMarked,
    color: "teal",
    perms: [
      { key: "subjects.view", label: "View Subjects" },
      { key: "subjects.create", label: "Create Subjects" },
      { key: "subjects.edit", label: "Edit Subjects" },
      { key: "subjects.delete", label: "Delete Subjects" },
    ],
  },
  {
    key: "students",
    label: "Student Management",
    icon: GraduationCap,
    color: "green",
    perms: [
      { key: "students.view", label: "View Students" },
      { key: "students.create", label: "Create Students" },
      { key: "students.edit", label: "Edit Students" },
      { key: "students.delete", label: "Delete Students" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: FileBarChart,
    color: "orange",
    perms: [
      { key: "reports.view", label: "View Reports" },
      { key: "reports.export", label: "Export Reports" },
    ],
  },
  {
    key: "activity_logs",
    label: "Activity Logs",
    icon: Activity,
    color: "pink",
    perms: [
      { key: "activity_logs.view", label: "View Activity Logs" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    color: "gray",
    perms: [
      { key: "settings.view", label: "View Settings" },
      { key: "settings.edit", label: "Edit Settings" },
    ],
  },
];

const colorMap: Record<string, { border: string; bg: string; text: string; badge: string; toggle: string; icon: string }> = {
  violet: { border: "border-violet-500/30", bg: "bg-violet-500/5", text: "text-violet-400", badge: "bg-violet-500/15 text-violet-300", toggle: "bg-violet-600", icon: "text-violet-400" },
  purple: { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-400", badge: "bg-purple-500/15 text-purple-300", toggle: "bg-purple-600", icon: "text-purple-400" },
  blue: { border: "border-blue-500/30", bg: "bg-blue-500/5", text: "text-blue-400", badge: "bg-blue-500/15 text-blue-300", toggle: "bg-blue-600", icon: "text-blue-400" },
  cyan: { border: "border-cyan-500/30", bg: "bg-cyan-500/5", text: "text-cyan-400", badge: "bg-cyan-500/15 text-cyan-300", toggle: "bg-cyan-600", icon: "text-cyan-400" },
  teal: { border: "border-teal-500/30", bg: "bg-teal-500/5", text: "text-teal-400", badge: "bg-teal-500/15 text-teal-300", toggle: "bg-teal-600", icon: "text-teal-400" },
  green: { border: "border-green-500/30", bg: "bg-green-500/5", text: "text-green-400", badge: "bg-green-500/15 text-green-300", toggle: "bg-green-600", icon: "text-green-400" },
  orange: { border: "border-orange-500/30", bg: "bg-orange-500/5", text: "text-orange-400", badge: "bg-orange-500/15 text-orange-300", toggle: "bg-orange-500", icon: "text-orange-400" },
  pink: { border: "border-pink-500/30", bg: "bg-pink-500/5", text: "text-pink-400", badge: "bg-pink-500/15 text-pink-300", toggle: "bg-pink-600", icon: "text-pink-400" },
  gray: { border: "border-gray-500/30", bg: "bg-gray-500/5", text: "text-gray-400", badge: "bg-gray-500/15 text-gray-300", toggle: "bg-gray-600", icon: "text-gray-400" },
};

function PermissionToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-violet-600" : "bg-gray-700"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function CategoryCard({
  category,
  selectedPerms,
  onToggle,
}: {
  category: (typeof permissionCategories)[0];
  selectedPerms: string[];
  onToggle: (perm: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const colors = colorMap[category.color] ?? colorMap.gray;
  const Icon = category.icon;
  const allSelected = category.perms.every((p) => selectedPerms.includes(p.key));
  const someSelected = category.perms.some((p) => selectedPerms.includes(p.key));
  const selectedCount = category.perms.filter((p) => selectedPerms.includes(p.key)).length;

  const toggleAll = () => {
    if (allSelected) {
      category.perms.forEach((p) => {
        if (selectedPerms.includes(p.key)) onToggle(p.key);
      });
    } else {
      category.perms.forEach((p) => {
        if (!selectedPerms.includes(p.key)) onToggle(p.key);
      });
    }
  };

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Category Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${colors.icon}`} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${colors.text}`}>{category.label}</p>
            <p className="text-xs text-gray-500">{selectedCount}/{category.perms.length} permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Select all toggle */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleAll(); }}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              allSelected
                ? `${colors.badge} border-transparent`
                : someSelected
                ? "border-gray-600 text-gray-400 hover:border-gray-500"
                : "border-gray-700 text-gray-500 hover:border-gray-600"
            }`}
          >
            {allSelected ? "All selected" : someSelected ? "Partial" : "Select all"}
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </div>

      {/* Permissions list */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-white/5 pt-3">
          {category.perms.map((perm) => (
            <div key={perm.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-gray-300">{perm.label}</p>
                <p className="text-[10px] text-gray-600 font-mono">{perm.key}</p>
              </div>
              <PermissionToggle
                checked={selectedPerms.includes(perm.key)}
                onChange={() => onToggle(perm.key)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoleManagement() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    roleName: "",
    shortName: "",
    description: "",
    permissions: [] as string[],
  });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.role.list.useQuery({ search: search || undefined, page, limit: 20 });

  const createMutation = trpc.role.create.useMutation({
    onSuccess: () => { toast.success("Role created successfully"); utils.role.list.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.role.update.useMutation({
    onSuccess: () => { toast.success("Role updated successfully"); utils.role.list.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message),
  });
  const toggleMutation = trpc.role.toggleActive.useMutation({ onSuccess: () => utils.role.list.invalidate() });
  const deleteMutation = trpc.role.delete.useMutation({
    onSuccess: () => { toast.success("Role deleted"); utils.role.list.invalidate(); },
  });

  const resetForm = () => {
    setFormData({ roleName: "", shortName: "", description: "", permissions: [] });
    setEditingId(null);
  };

  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const togglePerm = (perm: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const parseCsv = (content: string) => {
    const rows = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rows.length < 2) throw new Error("CSV must contain header and at least one row");
    const header = rows[0].split(",").map((h) => h.trim().toLowerCase());
    return rows.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      header.forEach((k, i) => (row[k] = vals[i] ?? ""));
      return row;
    });
  };

  const importRoles = async (content: string) => {
    setImporting(true);
    try {
      const rows = parseCsv(content);
      for (const r of rows) {
        if (!r.rolename && !r.role_name) throw new Error("Each row must include roleName");
        await createMutation.mutateAsync({
          roleName: r.rolename || r.role_name,
          shortName: r.shortname || r.short_name || r.rolename || r.role_name || "role",
          description: r.description || undefined,
          permissions: r.permissions ? r.permissions.split(/[;|,]/).map((s) => s.trim()).filter(Boolean) : [],
        });
      }
      toast.success("Imported roles successfully");
      utils.role.list.invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Import failed");
      return false;
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleExcel = () => {
    const headers = ["role_name", "short_name", "description", "permissions"];
    const sampleRow = ["Moderator", "moderator", "Can moderate content", "users.view|students.view|courses.view"];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Roles");
    XLSX.writeFile(workbook, "role_import_sample.xlsx");
    toast.success("Sample Excel format downloaded");
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) return;
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const success = await importRoles(csv);
      if (success) {
        setImportDialogOpen(false);
        setSelectedFile(null);
      }
    } catch (err: any) {
      toast.error("Failed to parse file: " + err.message);
    }
  };

  const exportRoles = () => {
    if (!data?.items) return;
    const headers = ["Role Name", "Short Name", "Description", "Permissions", "Status"];
    const rows = data.items.map((r) => [
      r.roleName, r.shortName, r.description ?? "",
      Array.isArray(r.permissions) ? (r.permissions as string[]).join("|") : "",
      r.isActive ? "Active" : "Inactive",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roles.csv";
    a.click();
    toast.success("Exported roles");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roleName || !formData.shortName) { toast.error("Fill required fields"); return; }
    if (editingId) updateMutation.mutate({ id: editingId, ...formData });
    else createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-500" />
            Role Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Define roles and assign granular permissions to staff users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportRoles}
            className="border-slate-200 text-slate-600 hover:bg-slate-50">
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setImportDialogOpen(true); }}
            className="border-slate-200 text-slate-600 hover:bg-slate-50">
            <UploadCloud className="w-4 h-4 mr-1.5" /> Import
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}
            className="bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-lg shadow-violet-100">
            <Plus className="w-4 h-4 mr-1.5" /> New Role
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search roles..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 border-slate-200 focus:border-violet-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Short Name</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Permissions</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-16 text-slate-400">Loading roles...</td></tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No roles found</p>
                    <p className="text-slate-400 text-xs mt-1">Create your first role to assign permissions to staff</p>
                  </td>
                </tr>
              ) : (
                data?.items.map((r) => {
                  const perms = Array.isArray(r.permissions) ? (r.permissions as string[]) : [];
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-violet-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{r.roleName}</p>
                            {r.description && <p className="text-xs text-slate-400 truncate max-w-[200px]">{r.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">{r.shortName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                          {perms.slice(0, 4).map((p) => (
                            <span key={p} className="text-[10px] bg-violet-50 text-violet-700 border border-violet-100 px-1.5 py-0.5 rounded-full">
                              {p}
                            </span>
                          ))}
                          {perms.length > 4 && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                              +{perms.length - 4} more
                            </span>
                          )}
                          {perms.length === 0 && <span className="text-xs text-slate-400">No permissions</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                          r.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-red-50 text-red-600 border-red-100"
                        }`}>
                          {r.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                            onClick={() => {
                              setEditingId(r.id);
                              setFormData({ roleName: r.roleName, shortName: r.shortName, description: r.description ?? "",
                                permissions: Array.isArray(r.permissions) ? (r.permissions as string[]) : [] });
                              setDialogOpen(true);
                            }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost"
                            className={`h-8 w-8 ${ r.isActive ? "text-slate-400 hover:text-orange-500 hover:bg-orange-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"}`}
                            onClick={() => toggleMutation.mutate({ id: r.id })}>
                            <Power className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => { if (confirm("Delete this role?")) deleteMutation.mutate({ id: r.id }); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > data.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-gray-500">Page {data.page} of {Math.ceil(data.total / data.limit)}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(data.total / data.limit)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Create / Edit Modal ─── */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-500/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-4.5 h-4.5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{editingId ? "Edit Role" : "Create New Role"}</h3>
                  <p className="text-xs text-gray-500">Configure role name and grant permissions</p>
                </div>
              </div>
              <button
                onClick={() => { setDialogOpen(false); resetForm(); }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs font-medium">Role Name <span className="text-red-400">*</span></Label>
                  <Input
                    value={formData.roleName}
                    onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                    placeholder="e.g., Data Entry Operator"
                    required
                    className="bg-gray-800/50 border-white/10 text-gray-200 placeholder:text-gray-600 focus:border-violet-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs font-medium">Short Name <span className="text-red-400">*</span></Label>
                  <Input
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    placeholder="e.g., DEO"
                    required
                    className="bg-gray-800/50 border-white/10 text-gray-200 placeholder:text-gray-600 focus:border-violet-500/50"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs font-medium">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this role..."
                  className="bg-gray-800/50 border-white/10 text-gray-200 placeholder:text-gray-600 focus:border-violet-500/50"
                />
              </div>

              {/* Permission Summary Bar */}
              <div className="flex items-center justify-between">
                <Label className="text-gray-400 text-xs font-medium uppercase tracking-wider">Permissions</Label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    <span className="text-violet-400 font-bold">{formData.permissions.length}</span> selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, permissions: [] }))}
                    className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {/* Permission Categories */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {permissionCategories.map((cat) => (
                  <CategoryCard
                    key={cat.key}
                    category={cat}
                    selectedPerms={formData.permissions}
                    onToggle={togglePerm}
                  />
                ))}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={() => { setDialogOpen(false); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-lg shadow-violet-500/25"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingId
                    ? updateMutation.isPending ? "Saving..." : "Save Changes"
                    : createMutation.isPending ? "Creating..." : "Create Role"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-violet-600 animate-bounce" />
                Import Role Records
              </h3>
              <button 
                type="button" 
                onClick={() => { setImportDialogOpen(false); setSelectedFile(null); }} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-violet-50/50 border border-violet-100 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold text-violet-900 flex items-center gap-1.5">
                  📁 1. Download Template
                </h4>
                <p className="text-xs text-violet-700 leading-relaxed">
                  To avoid import formatting errors, please download our standard sample Excel format, fill in the role records, and then upload it.
                </p>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-1 bg-white hover:bg-slate-50 border-violet-200 text-violet-700 hover:text-violet-800"
                  onClick={downloadSampleExcel}
                >
                  <Download className="w-3.5 h-3.5 mr-2" /> Download Sample Excel
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  📤 2. Upload File
                </h4>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-violet-400 transition-colors bg-slate-50/50 relative">
                  <input 
                    type="file" 
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={importing}
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-violet-600 truncate max-w-xs mx-auto">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-600">Click to upload or drag & drop</p>
                      <p className="text-xs text-slate-400">Excel or CSV files are allowed</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => { setImportDialogOpen(false); setSelectedFile(null); }}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-1.5" 
                onClick={handleImportSubmit} 
                disabled={!selectedFile || importing}
              >
                {importing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>Confirm Import</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
