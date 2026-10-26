import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Power, Trash2, Download, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useAuth } from "@/hooks/useAuth";

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [universityFilter, setUniversityFilter] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const { user } = useAuth();
  const isSuperAdmin = user?.universityId === null;

  const { data: univData } = trpc.university.list.useQuery(
    { limit: 100 },
    { enabled: isSuperAdmin }
  );

  const [formData, setFormData] = useState<{
    userId: string;
    name: string;
    nameHi: string;
    email: string;
    mobile: string;
    password: string;
    role: "admin" | "staff" | "student";
    universityId: string;
  }>({
    userId: "",
    name: "",
    nameHi: "",
    email: "",
    mobile: "",
    password: "",
    role: "staff",
    universityId: "",
  });
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.user.list.useQuery({
    search: search || undefined,
    role: (roleFilter as "admin" | "staff" | "student") || undefined,
    universityId: universityFilter ? parseInt(universityFilter) : undefined,
    page,
    limit: 20,
  });

  useEffect(() => {
    if (error?.data?.code === "UNAUTHORIZED" || error?.message?.toLowerCase().includes("authentication")) {
      window.location.href = "/login";
    }
  }, [error]);

  const clearForm = () => {
    setEditingUserId(null);
    setFormData({
      userId: "",
      name: "",
      nameHi: "",
      email: "",
      mobile: "",
      password: "",
      role: "staff",
      universityId: "",
    });
  };

  const createMutation = trpc.user.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      utils.user.list.invalidate();
      setShowDialog(false);
      clearForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      utils.user.list.invalidate();
      setShowDialog(false);
      clearForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.user.toggleActive.useMutation({
    onSuccess: () => { toast.success("Status toggled"); utils.user.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.user.delete.useMutation({
    onSuccess: () => { toast.success("User deleted"); utils.user.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const exportToCSV = () => {
    if (!data?.items) return;
    const headers = ["ID", "User ID", "Name", "Email", "Mobile", "Role", "Status"];
    const rows = data.items.map((u) => [u.id, u.userId, u.name, u.email, u.mobile, u.role, u.isActive ? "Active" : "Inactive"]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    toast.success("Exported to CSV");
  };

  const handleEditUser = (user: any) => {
    if (!user) return;
    setEditingUserId(user.id);
    setFormData({
      userId: user.userId,
      name: user.name,
      nameHi: user.nameHi ?? "",
      email: user.email,
      mobile: user.mobile ?? "",
      password: "",
      role: user.role,
      universityId: user.universityId ? String(user.universityId) : "",
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const payload: any = {
      name: formData.name,
      nameHi: formData.nameHi || undefined,
      email: formData.email,
      mobile: formData.mobile || undefined,
      role: formData.role,
      dob: undefined,
      gender: undefined,
      collegeId: undefined,
      isActive: undefined,
    };
    if (isSuperAdmin && formData.universityId) {
      payload.universityId = parseInt(formData.universityId);
    }

    if (editingUserId) {
      updateMutation.mutate({
        id: editingUserId,
        ...payload,
      });
    } else {
      createMutation.mutate({
        ...formData,
        universityId: formData.universityId ? parseInt(formData.universityId) : undefined,
      });
    }
  };

  const parseCsv = (content: string) => {
    const rows = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (rows.length < 2) {
      throw new Error("CSV must contain a header row and at least one user row.");
    }
    const header = rows[0].split(",").map((h) => h.trim().toLowerCase());
    return rows.slice(1).map((line) => {
      const values = line.split(",").map((value) => value.trim());
      const row: Record<string, string> = {};
      header.forEach((key, index) => {
        row[key] = values[index] ?? "";
      });
      return row;
    });
  };

  const importUsers = async (content: string) => {
    setImporting(true);
    try {
      const rows = parseCsv(content);
      for (const row of rows) {
        if (!row.userid || !row.name || !row.email || !row.password) {
          throw new Error("Each row must include userId, name, email, and password.");
        }
        await createMutation.mutateAsync({
          userId: row.userid,
          name: row.name,
          nameHi: row.namehi || undefined,
          email: row.email,
          mobile: row.mobile || undefined,
          password: row.password,
          role: (row.role as "admin" | "staff" | "student") || "student",
          dob: undefined,
          gender: undefined,
          collegeId: undefined,
        });
      }
      toast.success("Imported users successfully");
      utils.user.list.invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Import failed");
      return false;
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleExcel = () => {
    const headers = ["userId", "name", "nameHi", "email", "mobile", "password", "role"];
    const sampleRow = ["STAFF001", "Staff Member", "स्टाफ सदस्य", "staff001@example.com", "9876543210", "Rahul@8052", "staff"];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "user_import_sample.xlsx");
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
      const success = await importUsers(csv);
      if (success) {
        setImportDialogOpen(false);
        setSelectedFile(null);
      }
    } catch (err: any) {
      toast.error("Failed to parse file: " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}
            className="border-slate-200 text-slate-700 hover:bg-slate-50">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <PermissionGuard permission="users.create">
            <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setImportDialogOpen(true); }}
              className="border-slate-200 text-slate-700 hover:bg-slate-50">
              <UploadCloud className="w-4 h-4 mr-1" /> Import
            </Button>
            <Button size="sm" onClick={() => { clearForm(); setShowDialog(true); }}
              className="bg-violet-600 hover:bg-violet-700 text-white border-0">
              <Plus className="w-4 h-4 mr-1" /> Add User
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            {isSuperAdmin && (
              <select
                value={universityFilter}
                onChange={(e) => { setUniversityFilter(e.target.value); setPage(1); }}
                className="w-48 border rounded px-2 text-sm"
              >
                <option value="">All Universities</option>
                {univData?.items.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.universityName}
                  </option>
                ))}
              </select>
            )}
            <select 
              value={roleFilter} 
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="w-36 border rounded px-2 text-sm"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="student">Student</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">User ID</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
                  {isSuperAdmin && <th className="text-left py-2 px-3 font-medium text-gray-500">University</th>}
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Email</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Role</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-8">Loading...</td></tr>
                ) : data?.items.length === 0 ? (
                  <tr><td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-8 text-gray-500">No users found</td></tr>
                ) : (
                  data?.items.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{u.userId}</td>
                      <td className="py-2 px-3">
                        {u.name} {u.nameHi && <span className="text-xs text-gray-400">({u.nameHi})</span>}
                      </td>
                      {isSuperAdmin && (
                        <td className="py-2 px-3 text-gray-700 font-medium">
                          {u.universityName || <span className="text-gray-400 italic">None (Global)</span>}
                        </td>
                      )}
                      <td className="py-2 px-3">{u.email}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <PermissionGuard permission="users.edit">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditUser(u)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: u.id })}>
                              <Power className="w-4 h-4" />
                            </Button>
                          </PermissionGuard>
                          <PermissionGuard permission="users.delete">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: u.id }); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.total > data.limit && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Page {data.page} of {Math.ceil(data.total / data.limit)}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.total / data.limit)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUserId ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="e.g., STAFF001"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                disabled={!!editingUserId}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Name (English)</label>
              <Input
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Name (Hindi)</label>
              <Input
                placeholder="नाम (optional)"
                value={formData.nameHi}
                onChange={(e) => setFormData({ ...formData, nameHi: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mobile</label>
              <Input
                placeholder="+91 XXXXXXXXXX"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
            {!editingUserId && (
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as "admin" | "staff" | "student" })
                }
                className="w-full border rounded px-2 py-2 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="student">Student</option>
              </select>
            </div>
            {isSuperAdmin && (
              <div>
                <label className="text-sm font-medium">University</label>
                <select
                  value={formData.universityId}
                  onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                  className="w-full border rounded px-2 py-2 text-sm bg-white"
                >
                  <option value="">Select University (or Global)</option>
                  {univData?.items.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.universityName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                (editingUserId ? updateMutation.isPending : createMutation.isPending) ||
                !formData.userId ||
                !formData.name ||
                !formData.email ||
                (!editingUserId && !formData.password)
              }
            >
              {editingUserId
                ? updateMutation.isPending
                  ? "Saving..."
                  : "Save Changes"
                : createMutation.isPending
                ? "Creating..."
                : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {importDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-violet-600 animate-bounce" />
                Import User Records
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
                  To avoid import formatting errors, please download our standard sample Excel format, fill in the user records, and then upload it.
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
