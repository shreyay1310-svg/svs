import { useState } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Pencil, Power, Trash2, Download, X, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useAuth } from "@/hooks/useAuth";

export default function CollegeManagement() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth();
  const isSuperAdmin = user?.universityId === null;

  const { data: univData } = trpc.university.list.useQuery(
    { limit: 100 },
    { enabled: isSuperAdmin }
  );

  const [formData, setFormData] = useState({
    collegeName: "",
    collegeNameHi: "",
    collegeCode: "",
    address: "",
    description: "",
    contactEmail: "",
    phone: "",
    website: "",
    establishedYear: "",
    accreditation: "",
    affiliation: "",
    state: "",
    district: "",
    pincode: "",
    principalName: "",
    totalStudents: "",
    campusArea: "",
    landArea: "",
    motto: "",
    logoUrl: "",
    universityId: "",
  });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.college.list.useQuery({ search: search || undefined, page, limit: 20 });

  const createMutation = trpc.college.create.useMutation({
    onSuccess: () => { toast.success("College created"); utils.college.list.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.college.update.useMutation({
    onSuccess: () => { toast.success("Updated"); utils.college.list.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message),
  });
  const toggleMutation = trpc.college.toggleActive.useMutation({ onSuccess: () => utils.college.list.invalidate() });
  const deleteMutation = trpc.college.delete.useMutation({ onSuccess: () => { toast.success("Deleted"); utils.college.list.invalidate(); } });

  const resetForm = () => {
    setFormData({
      collegeName: "",
      collegeNameHi: "",
      collegeCode: "",
      address: "",
      description: "",
      contactEmail: "",
      phone: "",
      website: "",
      establishedYear: "",
      accreditation: "",
      affiliation: "",
      state: "",
      district: "",
      pincode: "",
      principalName: "",
      totalStudents: "",
      campusArea: "",
      landArea: "",
      motto: "",
      logoUrl: "",
      universityId: "",
    });
    setEditingId(null);
  };

  const [importing, setImporting] = useState(false);

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

  const importColleges = async (content: string) => {
    setImporting(true);
    try {
      const rows = parseCsv(content);
      for (const r of rows) {
        if (!r.collegename && !r.college_name) throw new Error("Each row must include college_name/collegeName");
        await createMutation.mutateAsync({
          collegeName: r.collegename || r.college_name,
          collegeNameHi: r.collegenamehi || r.college_name_hi || undefined,
          collegeCode: r.collegecode || r.college_code || ("CLG" + Math.floor(1000 + Math.random() * 9000)),
          address: r.address || undefined,
          description: r.description || undefined,
          contactEmail: r.contactemail || r.contact_email || undefined,
          phone: r.phone || undefined,
          website: r.website || undefined,
          establishedYear: r.establishedyear ? parseInt(r.establishedyear) : undefined,
          accreditation: r.accreditation || undefined,
          affiliation: r.affiliation || undefined,
          state: r.state || undefined,
          district: r.district || undefined,
          pincode: r.pincode || undefined,
          principalName: r.principalname || r.principal_name || undefined,
          totalStudents: r.totalstudents ? parseInt(r.totalstudents) : undefined,
          campusArea: r.campusarea || r.campus_area || undefined,
          landArea: r.landarea || r.land_area || undefined,
          motto: r.motto || undefined,
          logoUrl: r.logourl || r.logo_url || undefined,
        });
      }
      toast.success("Imported colleges successfully");
      utils.college.list.invalidate();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Import failed");
      return false;
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleExcel = () => {
    const headers = [
      "college_name", "college_name_hi", "college_code", "address", "description",
      "contact_email", "phone", "website", "established_year", "accreditation",
      "affiliation", "state", "district", "pincode", "principal_name",
      "total_students", "campus_area", "land_area", "motto"
    ];
    const sampleRow = [
      "Rajasthan Technical College", "राजस्थान तकनीकी कॉलेज", "RTC01", "Jaipur, Rajasthan", "Engineering College",
      "info@rtc.edu", "0141234567", "http://rtc.edu", "2005", "NAAC A",
      "Rajasthan University", "Rajasthan", "Jaipur", "302001", "Dr. Principal",
      "1200", "50 acres", "50 acres", "Knowledge is power"
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Colleges");
    XLSX.writeFile(workbook, "college_import_sample.xlsx");
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
      const success = await importColleges(csv);
      if (success) {
        setImportDialogOpen(false);
        setSelectedFile(null);
      }
    } catch (err: any) {
      toast.error("Failed to parse file: " + err.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.collegeName || !formData.collegeCode) { toast.error("Fill required fields"); return; }
    const payload: any = {
      collegeName: formData.collegeName,
      collegeNameHi: formData.collegeNameHi || undefined,
      collegeCode: formData.collegeCode,
      address: formData.address || undefined,
      description: formData.description || undefined,
      contactEmail: formData.contactEmail || undefined,
      phone: formData.phone || undefined,
      website: formData.website || undefined,
      establishedYear: formData.establishedYear ? parseInt(formData.establishedYear) : undefined,
      accreditation: formData.accreditation || undefined,
      affiliation: formData.affiliation || undefined,
      state: formData.state || undefined,
      district: formData.district || undefined,
      pincode: formData.pincode || undefined,
      principalName: formData.principalName || undefined,
      totalStudents: formData.totalStudents ? parseInt(formData.totalStudents) : undefined,
      campusArea: formData.campusArea || undefined,
      landArea: formData.landArea || undefined,
      motto: formData.motto || undefined,
      logoUrl: formData.logoUrl || undefined,
    };
    if (isSuperAdmin && formData.universityId) {
      payload.universityId = parseInt(formData.universityId);
    }
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">College Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <PermissionGuard permission="colleges.create">
            <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setImportDialogOpen(true); }}
              className="border-slate-200 text-slate-700 hover:bg-slate-50">
              <UploadCloud className="w-4 h-4 mr-1" /> Import
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0">
              <Plus className="w-4 h-4 mr-1" /> Add College
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Simple Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{editingId ? "Edit College" : "Add College"}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {isSuperAdmin && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>University *</Label>
                    <select
                      value={formData.universityId}
                      onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 bg-white text-sm"
                      required
                    >
                      <option value="">Select University</option>
                      {univData?.items.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.universityName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>College Name *</Label><Input value={formData.collegeName} onChange={e => setFormData({...formData, collegeName: e.target.value})} required /></div>
                <div><Label>College Name (Hindi)</Label><Input value={formData.collegeNameHi} onChange={e => setFormData({...formData, collegeNameHi: e.target.value})} placeholder="देवल्य्स १००" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>College Code *</Label><Input value={formData.collegeCode} onChange={e => setFormData({...formData, collegeCode: e.target.value})} required /></div>
                <div><Label>Address</Label><Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Contact Email</Label><Input value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} type="email" /></div>
                <div><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div><Label>Website</Label><Input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Established Year</Label><Input value={formData.establishedYear} onChange={e => setFormData({...formData, establishedYear: e.target.value})} /></div>
                <div><Label>Accreditation</Label><Input value={formData.accreditation} onChange={e => setFormData({...formData, accreditation: e.target.value})} /></div>
                <div><Label>Affiliation</Label><Input value={formData.affiliation} onChange={e => setFormData({...formData, affiliation: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>State</Label><Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} /></div>
                <div><Label>District</Label><Input value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} /></div>
                <div><Label>Pincode</Label><Input value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Principal Name</Label><Input value={formData.principalName} onChange={e => setFormData({...formData, principalName: e.target.value})} /></div>
                <div><Label>Total Students</Label><Input value={formData.totalStudents} onChange={e => setFormData({...formData, totalStudents: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Campus Area</Label><Input value={formData.campusArea} onChange={e => setFormData({...formData, campusArea: e.target.value})} /></div>
                <div><Label>Land Area</Label><Input value={formData.landArea} onChange={e => setFormData({...formData, landArea: e.target.value})} /></div>
                <div><Label>Motto</Label><Input value={formData.motto} onChange={e => setFormData({...formData, motto: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div><Label>Logo URL</Label><Input value={formData.logoUrl} onChange={e => setFormData({...formData, logoUrl: e.target.value})} /></div>
              </div>
              <div><Label>Description</Label><Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <Button type="submit" className="w-full">{editingId ? "Update" : "Create"}</Button>
            </form>
          </div>
        </div>
      )}

      <Card><CardContent className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search colleges..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
              {isSuperAdmin && <th className="text-left py-2 px-3 font-medium text-gray-500">University</th>}
              <th className="text-left py-2 px-3 font-medium text-gray-500">Code</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Address</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8">Loading...</td></tr> :
               data?.items.length === 0 ? <tr><td colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8 text-gray-500">No colleges</td></tr> :
               data?.items.map(c => (
                <tr key={c.id} className="border-b border-gray-55 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{c.collegeName} {c.collegeNameHi && <span className="text-xs text-gray-400 block">{c.collegeNameHi}</span>}</td>
                  {isSuperAdmin && <td className="py-2 px-3 text-gray-700 font-medium">{c.universityName || <span className="text-gray-400 italic">None</span>}</td>}
                  <td className="py-2 px-3">{c.collegeCode}</td>
                  <td className="py-2 px-3 text-gray-500">{c.address}</td>
                  <td className="py-2 px-3"><span className={`text-xs px-2 py-1 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.isActive ? "Active" : "Inactive"}</span></td>
                  <td className="py-2 px-3"><div className="flex gap-1">
                    <PermissionGuard permission="colleges.edit">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(c.id); setFormData({ collegeName: c.collegeName, collegeNameHi: c.collegeNameHi ?? "", collegeCode: c.collegeCode, address: c.address ?? "", description: c.description ?? "", contactEmail: c.contactEmail ?? "", phone: c.phone ?? "", website: c.website ?? "", establishedYear: c.establishedYear ? String(c.establishedYear) : "", accreditation: c.accreditation ?? "", affiliation: c.affiliation ?? "", state: c.state ?? "", district: c.district ?? "", pincode: c.pincode ?? "", principalName: c.principalName ?? "", totalStudents: c.totalStudents ? String(c.totalStudents) : "", campusArea: c.campusArea ?? "", landArea: c.landArea ?? "", motto: c.motto ?? "", logoUrl: c.logoUrl ?? "", universityId: c.universityId ? String(c.universityId) : "" }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: c.id })}><Power className="w-4 h-4" /></Button>
                    </PermissionGuard>
                    <PermissionGuard permission="colleges.delete">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: c.id }); }}><Trash2 className="w-4 h-4" /></Button>
                    </PermissionGuard>
                  </div></td>
                </tr>
              ))}
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
      </CardContent></Card>

      {importDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600 animate-bounce" />
                Import College Records
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
                  To avoid import formatting errors, please download our standard sample Excel format, fill in the college records, and then upload it.
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
