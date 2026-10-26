import { useState } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Pencil, Power, Trash2, Download, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function UniversityManagement() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    universityName: "",
    universityNameHi: "",
    universityCode: "",
    address: "",
    logoUrl: "",
  });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.university.list.useQuery({ search: search || undefined, page, limit: 20 });

  const createMutation = trpc.university.create.useMutation({
    onSuccess: () => {
      toast.success("University created");
      utils.university.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.university.update.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      utils.university.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.university.toggleActive.useMutation({
    onSuccess: () => utils.university.list.invalidate(),
  });

  const deleteMutation = trpc.university.delete.useMutation({
    onSuccess: () => {
      toast.success("Deleted");
      utils.university.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormData({
      universityName: "",
      universityNameHi: "",
      universityCode: "",
      address: "",
      logoUrl: "",
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.universityName || !formData.universityCode) {
      toast.error("Fill required fields");
      return;
    }
    const payload = {
      universityName: formData.universityName,
      universityNameHi: formData.universityNameHi || undefined,
      universityCode: formData.universityCode,
      address: formData.address || undefined,
      logoUrl: formData.logoUrl || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const exportToCSV = () => {
    if (!data?.items) return;
    const headers = ["ID", "University Name", "University Name Hindi", "University Code", "Address", "Status"];
    const rows = data.items.map((u) => [
      u.id,
      u.universityName,
      u.universityNameHi ?? "",
      u.universityCode,
      u.address ?? "",
      u.isActive ? "Active" : "Inactive"
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "universities.csv";
    a.click();
    toast.success("Exported universities to CSV");
  };

  const parseCsv = (content: string) => {
    const rows = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (rows.length < 2) throw new Error("CSV must contain header and at least one row");
    const header = rows[0].split(",").map(h => h.trim().toLowerCase());
    return rows.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const row: Record<string,string> = {};
      header.forEach((k,i) => row[k] = vals[i] ?? "");
      return row;
    });
  };

  const importUniversities = async (content: string) => {
    setImporting(true);
    try {
      const rows = parseCsv(content);
      for (const r of rows) {
        if (!r.universityname && !r.university_name) throw new Error("Each row must include university_name");
        if (!r.universitycode && !r.university_code) throw new Error("Each row must include university_code");
        await createMutation.mutateAsync({
          universityName: r.universityname || r.university_name,
          universityNameHi: r.universitynamehi || r.university_name_hi || undefined,
          universityCode: r.universitycode || r.university_code,
          address: r.address || undefined,
          logoUrl: r.logourl || r.logo_url || undefined,
        });
      }
      toast.success("Imported universities successfully");
      utils.university.list.invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Import failed");
      return false;
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleExcel = () => {
    const headers = ["university_name", "university_name_hi", "university_code", "address", "logo_url"];
    const sampleRow = ["Rajasthan University", "राजस्थान विश्वविद्यालय", "RU", "Jaipur, Rajasthan", ""];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Universities");
    XLSX.writeFile(workbook, "university_import_sample.xlsx");
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
      const success = await importUniversities(csv);
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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">University Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}
            className="border-gray-200 text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <PermissionGuard permission="universities.create">
            <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setImportDialogOpen(true); }}
              className="border-gray-200 text-gray-700 hover:bg-gray-50">
              <UploadCloud className="w-4 h-4 mr-1" /> Import
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              <Plus className="w-4 h-4 mr-1" /> Add University
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{editingId ? "Edit University" : "Add University"}</h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>University Name *</Label>
                  <Input
                    value={formData.universityName}
                    onChange={(e) => setFormData({ ...formData, universityName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>University Name (Hindi)</Label>
                  <Input
                    value={formData.universityNameHi}
                    onChange={(e) => setFormData({ ...formData, universityNameHi: e.target.value })}
                    placeholder="देवल्य्स १००"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>University Code *</Label>
                  <Input
                    value={formData.universityCode}
                    onChange={(e) => setFormData({ ...formData, universityCode: e.target.value })}
                    required
                    disabled={editingId !== null}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>Logo URL</Label>
                  <Input
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Create"}
              </Button>
            </form>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search universities..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Code</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Address</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      Loading...
                    </td>
                  </tr>
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No universities
                    </td>
                  </tr>
                ) : (
                  data?.items.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">
                        {u.universityName}{" "}
                        {u.universityNameHi && (
                          <span className="text-xs text-gray-400 block">{u.universityNameHi}</span>
                        )}
                      </td>
                      <td className="py-2 px-3">{u.universityCode}</td>
                      <td className="py-2 px-3 text-gray-500">{u.address}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <PermissionGuard permission="universities.edit">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-600"
                              onClick={() => {
                                setEditingId(u.id);
                                setFormData({
                                  universityName: u.universityName,
                                  universityNameHi: u.universityNameHi ?? "",
                                  universityCode: u.universityCode,
                                  address: u.address ?? "",
                                  logoUrl: u.logoUrl ?? "",
                                });
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-yellow-600"
                              onClick={() => toggleMutation.mutate({ id: u.id })}
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                          </PermissionGuard>
                          <PermissionGuard permission="universities.delete">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-500"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this university?")) {
                                  deleteMutation.mutate({ id: u.id });
                                }
                              }}
                            >
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
              <p className="text-sm text-gray-500">
                Page {data.page} of {Math.ceil(data.total / data.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(data.total / data.limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {importDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600 animate-bounce" />
                Import University Records
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
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                  📁 1. Download Template
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  To avoid import formatting errors, please download our standard sample Excel format, fill in the university records, and then upload it.
                </p>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-1 bg-white hover:bg-slate-50 border-blue-200 text-blue-700 hover:text-blue-800"
                  onClick={downloadSampleExcel}
                >
                  <Download className="w-3.5 h-3.5 mr-2" /> Download Sample Excel
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  📤 2. Upload File
                </h4>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50 relative">
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
                      <p className="text-sm font-semibold text-blue-600 truncate max-w-xs mx-auto">{selectedFile.name}</p>
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5" 
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
