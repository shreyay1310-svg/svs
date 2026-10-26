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

export default function CourseManagement() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    courseName: "",
    courseNameHi: "",
    courseCode: "",
    collegeId: "",
    description: "",
    durationYears: "",
    durationMonths: "",
    credits: "",
    level: "",
    seats: "",
    fee: "",
    eligibility: "",
    syllabusUrl: "",
    coordinatorName: "",
    coordinatorEmail: "",
    isProfessional: false,
    intakePerYear: "",
    mode: "",
    campus: "",
    remarks: "",
  });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.course.list.useQuery({ search: search || undefined, page, limit: 20 });
  const { data: collegesData } = trpc.college.list.useQuery({ page: 1, limit: 100 });

  const createMutation = trpc.course.create.useMutation({
    onSuccess: () => { toast.success("Course created"); utils.course.list.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.course.update.useMutation({
    onSuccess: () => { toast.success("Updated"); utils.course.list.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message),
  });
  const toggleMutation = trpc.course.toggleActive.useMutation({ onSuccess: () => utils.course.list.invalidate() });
  const deleteMutation = trpc.course.delete.useMutation({ onSuccess: () => { toast.success("Deleted"); utils.course.list.invalidate(); } });

  const resetForm = () => {
    setFormData({ courseName: "", courseNameHi: "", courseCode: "", collegeId: "", description: "", durationYears: "", durationMonths: "", credits: "", level: "", seats: "", fee: "", eligibility: "", syllabusUrl: "", coordinatorName: "", coordinatorEmail: "", isProfessional: false, intakePerYear: "", mode: "", campus: "", remarks: "" });
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

  const importCourses = async (content: string) => {
    setImporting(true);
    try {
      const rows = parseCsv(content);
      for (const r of rows) {
        if (!r.coursename && !r.course_name) throw new Error("Each row must include course_name");
        await createMutation.mutateAsync({
          courseName: r.coursename || r.course_name,
          courseNameHi: r.coursenamehi || r.course_name_hi || undefined,
          courseCode: r.coursecode || r.course_code || undefined,
          collegeId: r.collegeid ? parseInt(r.collegeid) : (r.college_id ? parseInt(r.college_id) : 1),
          description: r.description || undefined,
          durationYears: r.durationyears ? parseInt(r.durationyears) : undefined,
          durationMonths: r.durationmonths ? parseInt(r.durationmonths) : undefined,
          credits: r.credits ? parseInt(r.credits) : undefined,
          level: r.level || undefined,
          seats: r.seats ? parseInt(r.seats) : undefined,
          fee: r.fee ? parseInt(r.fee) : undefined,
          eligibility: r.eligibility || undefined,
          syllabusUrl: r.syllabusurl || r.syllabus_url || undefined,
          coordinatorName: r.coordinatorname || r.coordinator_name || undefined,
          coordinatorEmail: r.coordinatoremail || r.coordinator_email || undefined,
          isProfessional: r.isprofessional === 'true' || r.isprofessional === '1',
          intakePerYear: r.intakeperyear ? parseInt(r.intakeperyear) : undefined,
          mode: r.mode || undefined,
          campus: r.campus || undefined,
          remarks: r.remarks || undefined,
        });
      }
      toast.success("Imported courses successfully");
      utils.course.list.invalidate();
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
      "course_name", "course_name_hi", "course_code", "college_id", "description",
      "duration_years", "duration_months", "credits", "level", "seats",
      "fee", "eligibility", "syllabus_url", "coordinator_name", "coordinator_email"
    ];
    const sampleRow = [
      "Bachelor of Science", "बैचलर ऑफ विज्ञान", "BSc", "1", "Undergraduate Science Program",
      "3", "0", "120", "ug", "60", "15000", "12th Science", "http://syllabus.com",
      "Dr. Kumar", "kumar@example.com"
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Courses");
    XLSX.writeFile(workbook, "course_import_sample.xlsx");
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
      const success = await importCourses(csv);
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
    if (!formData.courseName || !formData.collegeId) { toast.error("Fill required fields"); return; }
    const payload: any = {
      courseName: formData.courseName,
      courseNameHi: formData.courseNameHi || undefined,
      courseCode: formData.courseCode || undefined,
      collegeId: parseInt(formData.collegeId),
      description: formData.description || undefined,
      durationYears: formData.durationYears ? parseInt(formData.durationYears) : undefined,
      durationMonths: formData.durationMonths ? parseInt(formData.durationMonths) : undefined,
      credits: formData.credits ? parseInt(formData.credits) : undefined,
      level: formData.level || undefined,
      seats: formData.seats ? parseInt(formData.seats) : undefined,
      fee: formData.fee ? parseInt(formData.fee) : undefined,
      eligibility: formData.eligibility || undefined,
      syllabusUrl: formData.syllabusUrl || undefined,
      coordinatorName: formData.coordinatorName || undefined,
      coordinatorEmail: formData.coordinatorEmail || undefined,
      isProfessional: formData.isProfessional || false,
      intakePerYear: formData.intakePerYear ? parseInt(formData.intakePerYear) : undefined,
      mode: formData.mode || undefined,
      campus: formData.campus || undefined,
      remarks: formData.remarks || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Course Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <PermissionGuard permission="courses.create">
            <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setImportDialogOpen(true); }}
              className="border-slate-200 text-slate-700 hover:bg-slate-50">
              <UploadCloud className="w-4 h-4 mr-1" /> Import
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}
              className="bg-green-600 hover:bg-green-700 text-white border-0">
              <Plus className="w-4 h-4 mr-1" /> Add Course
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{editingId ? "Edit Course" : "Add Course"}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Course Name *</Label><Input value={formData.courseName} onChange={e => setFormData({...formData, courseName: e.target.value})} required /></div>
                <div><Label>Course Name (Hindi)</Label><Input value={formData.courseNameHi} onChange={e => setFormData({...formData, courseNameHi: e.target.value})} placeholder="देवल्य्स १००" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Course Code</Label><Input value={formData.courseCode} onChange={e => setFormData({...formData, courseCode: e.target.value})} /></div>
                <div><Label>College *</Label>
                  <select value={formData.collegeId} onChange={e => setFormData({...formData, collegeId: e.target.value})} className="w-full border rounded px-2 py-2 text-sm bg-white" required>
                    <option value="">Select college</option>
                    {collegesData?.items.map(c => <option key={c.id} value={String(c.id)}>{c.collegeName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Duration (yrs)</Label><Input value={formData.durationYears} onChange={e => setFormData({...formData, durationYears: e.target.value})} /></div>
                <div><Label>Duration (months)</Label><Input value={formData.durationMonths} onChange={e => setFormData({...formData, durationMonths: e.target.value})} /></div>
                <div><Label>Credits</Label><Input value={formData.credits} onChange={e => setFormData({...formData, credits: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Level</Label><Input value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} /></div>
                <div><Label>Seats</Label><Input value={formData.seats} onChange={e => setFormData({...formData, seats: e.target.value})} /></div>
                <div><Label>Fee</Label><Input value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Coordinator</Label><Input value={formData.coordinatorName} onChange={e => setFormData({...formData, coordinatorName: e.target.value})} /></div>
                <div><Label>Coordinator Email</Label><Input value={formData.coordinatorEmail} onChange={e => setFormData({...formData, coordinatorEmail: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div><Label>Eligibility</Label><Input value={formData.eligibility} onChange={e => setFormData({...formData, eligibility: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Syllabus URL</Label><Input value={formData.syllabusUrl} onChange={e => setFormData({...formData, syllabusUrl: e.target.value})} /></div>
                <div><Label>Mode</Label><Input value={formData.mode} onChange={e => setFormData({...formData, mode: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Campus</Label><Input value={formData.campus} onChange={e => setFormData({...formData, campus: e.target.value})} /></div>
                <div><Label>Intake Per Year</Label><Input value={formData.intakePerYear} onChange={e => setFormData({...formData, intakePerYear: e.target.value})} /></div>
              </div>
              <div><Label>Remarks</Label><Input value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} /></div>
              <Button type="submit" className="w-full">{editingId ? "Update" : "Create"}</Button>
            </form>
          </div>
        </div>
      )}

      <Card><CardContent className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search courses..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Code</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">College</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr> :
               data?.items.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">No courses</td></tr> :
               data?.items.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{c.courseName} {c.courseNameHi && <span className="text-xs text-gray-400 block">{c.courseNameHi}</span>}</td>
                  <td className="py-2 px-3">{c.courseCode}</td>
                  <td className="py-2 px-3 text-gray-500">{c.collegeName}</td>
                  <td className="py-2 px-3"><span className={`text-xs px-2 py-1 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.isActive ? "Active" : "Inactive"}</span></td>
                  <td className="py-2 px-3"><div className="flex gap-1">
                    <PermissionGuard permission="courses.edit">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(c.id); setFormData({ courseName: c.courseName, courseNameHi: c.courseNameHi ?? "", courseCode: c.courseCode ?? "", collegeId: String(c.collegeId), description: c.description ?? "", durationYears: c.durationYears ? String(c.durationYears) : "", durationMonths: c.durationMonths ? String(c.durationMonths) : "", credits: c.credits ? String(c.credits) : "", level: c.level ?? "", seats: c.seats ? String(c.seats) : "", fee: c.fee ? String(c.fee) : "", eligibility: c.eligibility ?? "", syllabusUrl: c.syllabusUrl ?? "", coordinatorName: c.coordinatorName ?? "", coordinatorEmail: c.coordinatorEmail ?? "", isProfessional: !!c.isProfessional, intakePerYear: c.intakePerYear ? String(c.intakePerYear) : "", mode: c.mode ?? "", campus: c.campus ?? "", remarks: c.remarks ?? "" }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: c.id })}><Power className="w-4 h-4" /></Button>
                    </PermissionGuard>
                    <PermissionGuard permission="courses.delete">
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
                <UploadCloud className="w-5 h-5 text-green-600 animate-bounce" />
                Import Course Records
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
              <div className="bg-green-50/50 border border-green-100 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold text-green-900 flex items-center gap-1.5">
                  📁 1. Download Template
                </h4>
                <p className="text-xs text-green-700 leading-relaxed">
                  To avoid import formatting errors, please download our standard sample Excel format, fill in the course records, and then upload it.
                </p>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-1 bg-white hover:bg-slate-50 border-green-200 text-green-700 hover:text-green-800"
                  onClick={downloadSampleExcel}
                >
                  <Download className="w-3.5 h-3.5 mr-2" /> Download Sample Excel
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  📤 2. Upload File
                </h4>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-green-400 transition-colors bg-slate-50/50 relative">
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
                      <p className="text-sm font-semibold text-green-600 truncate max-w-xs mx-auto">{selectedFile.name}</p>
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
                className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1.5" 
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
