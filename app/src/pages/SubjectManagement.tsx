import React, { useState } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Pencil, Power, Trash2, Download, X, UploadCloud } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function SubjectManagement() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    subjectName: "",
    subjectNameHi: "",
    subjectCode: "",
    courseType: "honors" as "honors" | "masters",
    courseId: "",
    collegeId: "",
    credits: "",
    semester: "",
    theoryMarks: "",
    practicalMarks: "",
    totalMarks: "",
    isElective: false,
    prerequisites: "",
    learningOutcomes: "",
    syllabusUrl: "",
    referenceBooks: "",
    labRequired: false,
    hoursPerWeek: "",
    assessmentMethod: "",
    remarks: "",
    description: "",
  });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.subject.list.useQuery({ search: search || undefined, page, limit: 20 });
  const { data: collegesData } = trpc.college.list.useQuery({ page: 1, limit: 100 });
  const { data: coursesData } = trpc.course.list.useQuery({ page: 1, limit: 100 });

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

  const importSubjects = async (content: string) => {
    setImporting(true);
    try {
      const rows = parseCsv(content);
      for (const r of rows) {
        if (!r.subjectname && !r.subject_name) throw new Error("Each row must include subject_name");
        await createMutation.mutateAsync({
          subjectName: r.subjectname || r.subject_name,
          subjectNameHi: r.subjectnamehi || r.subject_name_hi || undefined,
          subjectCode: r.subjectcode || r.subject_code || undefined,
          courseType: (r.coursetype || r.course_type) as any || undefined,
          courseId: r.courseid ? parseInt(r.courseid) : (r.course_id ? parseInt(r.course_id) : 1),
          collegeId: r.collegeid ? parseInt(r.collegeid) : (r.college_id ? parseInt(r.college_id) : 1),
          credits: r.credits ? parseInt(r.credits) : undefined,
          semester: r.semester ? parseInt(r.semester) : undefined,
          theoryMarks: r.theorymarks ? parseInt(r.theorymarks) : undefined,
          practicalMarks: r.practicalmarks ? parseInt(r.practicalmarks) : undefined,
          totalMarks: r.totalmarks ? parseInt(r.totalmarks) : undefined,
          isElective: r.iselective === 'true' || r.iselective === '1',
          prerequisites: r.prerequisites || undefined,
          learningOutcomes: r.learningoutcomes || undefined,
          syllabusUrl: r.syllabusurl || r.syllabus_url || undefined,
          referenceBooks: r.referencebooks || r.reference_books || undefined,
          labRequired: r.labrequired === 'true' || r.labrequired === '1',
          hoursPerWeek: r.hoursperweek ? parseInt(r.hoursperweek) : undefined,
          assessmentMethod: r.assessmentmethod || undefined,
          remarks: r.remarks || undefined,
          description: r.description || undefined,
        });
      }
      toast.success("Imported subjects successfully");
      utils.subject.list.invalidate();
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
      "subject_name", "subject_name_hi", "subject_code", "course_type", "course_id",
      "college_id", "credits", "semester", "theory_marks", "practical_marks",
      "total_marks", "is_elective", "prerequisites", "learning_outcomes",
      "syllabus_url", "reference_books", "lab_required", "hours_per_week", "assessment_method"
    ];
    const sampleRow = [
      "Introduction to History", "इतिहास का परिचय", "HIST101", "honors", "1",
      "1", "4", "1", "70", "30", "100", "false", "None", "Understand history basis",
      "http://syllabus.com", "Book A, Book B", "false", "4", "Written exam"
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subjects");
    XLSX.writeFile(workbook, "subject_import_sample.xlsx");
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
      const success = await importSubjects(csv);
      if (success) {
        setImportDialogOpen(false);
        setSelectedFile(null);
      }
    } catch (err: any) {
      toast.error("Failed to parse file: " + err.message);
    }
  };

  const createMutation = trpc.subject.create.useMutation({
    onSuccess: () => { toast.success("Subject created"); utils.subject.list.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.subject.update.useMutation({
    onSuccess: () => { toast.success("Updated"); utils.subject.list.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message),
  });
  const toggleMutation = trpc.subject.toggleActive.useMutation({ onSuccess: () => utils.subject.list.invalidate() });
  const deleteMutation = trpc.subject.delete.useMutation({ onSuccess: () => { toast.success("Deleted"); utils.subject.list.invalidate(); } });

  const resetForm = () => {
    setFormData({ subjectName: "", subjectNameHi: "", subjectCode: "", courseType: "honors", courseId: "", collegeId: "", credits: "", semester: "", theoryMarks: "", practicalMarks: "", totalMarks: "", isElective: false, prerequisites: "", learningOutcomes: "", syllabusUrl: "", referenceBooks: "", labRequired: false, hoursPerWeek: "", assessmentMethod: "", remarks: "", description: "" });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectName || !formData.courseId || !formData.collegeId) { toast.error("Fill required fields"); return; }
    const payload: any = {
      subjectName: formData.subjectName,
      subjectNameHi: formData.subjectNameHi || undefined,
      subjectCode: formData.subjectCode || undefined,
      courseType: formData.courseType,
      courseId: parseInt(formData.courseId),
      collegeId: parseInt(formData.collegeId),
      credits: formData.credits ? parseInt(formData.credits) : undefined,
      semester: formData.semester ? parseInt(formData.semester) : undefined,
      theoryMarks: formData.theoryMarks ? parseInt(formData.theoryMarks) : undefined,
      practicalMarks: formData.practicalMarks ? parseInt(formData.practicalMarks) : undefined,
      totalMarks: formData.totalMarks ? parseInt(formData.totalMarks) : undefined,
      isElective: !!formData.isElective,
      prerequisites: formData.prerequisites || undefined,
      learningOutcomes: formData.learningOutcomes || undefined,
      syllabusUrl: formData.syllabusUrl || undefined,
      referenceBooks: formData.referenceBooks || undefined,
      labRequired: !!formData.labRequired,
      hoursPerWeek: formData.hoursPerWeek ? parseInt(formData.hoursPerWeek) : undefined,
      assessmentMethod: formData.assessmentMethod || undefined,
      remarks: formData.remarks || undefined,
      description: formData.description || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
          <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setImportDialogOpen(true); }}><UploadCloud className="w-4 h-4 mr-1" /> Import</Button>
          <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Subject</Button>
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{editingId ? "Edit Subject" : "Add Subject"}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Subject Name *</Label><Input value={formData.subjectName} onChange={e => setFormData({...formData, subjectName: e.target.value})} required /></div>
                <div><Label>Subject Name (Hindi)</Label><Input value={formData.subjectNameHi} onChange={e => setFormData({...formData, subjectNameHi: e.target.value})} placeholder="देवल्य्स १००" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Subject Code</Label><Input value={formData.subjectCode} onChange={e => setFormData({...formData, subjectCode: e.target.value})} /></div>
                <div><Label>Credits</Label><Input value={formData.credits} onChange={e => setFormData({...formData, credits: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Course Type *</Label>
                  <select value={formData.courseType} onChange={e => setFormData({...formData, courseType: e.target.value as "honors" | "masters"})} className="w-full border rounded px-2 py-2 text-sm bg-white">
                    <option value="honors">Honors</option>
                    <option value="masters">Masters</option>
                  </select>
                </div>
                <div><Label>College *</Label>
                  <select value={formData.collegeId} onChange={e => setFormData({...formData, collegeId: e.target.value})} className="w-full border rounded px-2 py-2 text-sm bg-white" required>
                    <option value="">Select</option>
                    {collegesData?.items.map(c => <option key={c.id} value={String(c.id)}>{c.collegeName}</option>)}
                  </select>
                </div>
                <div><Label>Course *</Label>
                  <select value={formData.courseId} onChange={e => setFormData({...formData, courseId: e.target.value})} className="w-full border rounded px-2 py-2 text-sm bg-white" required>
                    <option value="">Select</option>
                    {coursesData?.items.map(c => <option key={c.id} value={String(c.id)}>{c.courseName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Semester</Label><Input value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} /></div>
                <div><Label>Theory Marks</Label><Input value={formData.theoryMarks} onChange={e => setFormData({...formData, theoryMarks: e.target.value})} /></div>
                <div><Label>Practical Marks</Label><Input value={formData.practicalMarks} onChange={e => setFormData({...formData, practicalMarks: e.target.value})} /></div>
               </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Total Marks</Label><Input value={formData.totalMarks} onChange={e => setFormData({...formData, totalMarks: e.target.value})} /></div>
                <div className="flex items-center gap-2"><Checkbox checked={formData.isElective} onCheckedChange={(v) => setFormData({...formData, isElective: !!v})} /> <Label>Is Elective</Label></div>
              </div>
              <div><Label>Prerequisites</Label><Input value={formData.prerequisites} onChange={e => setFormData({...formData, prerequisites: e.target.value})} /></div>
              <div><Label>Learning Outcomes</Label><Input value={formData.learningOutcomes} onChange={e => setFormData({...formData, learningOutcomes: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Syllabus URL</Label><Input value={formData.syllabusUrl} onChange={e => setFormData({...formData, syllabusUrl: e.target.value})} /></div>
                <div><Label>Reference Books</Label><Input value={formData.referenceBooks} onChange={e => setFormData({...formData, referenceBooks: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2"><Checkbox checked={formData.labRequired} onCheckedChange={(v) => setFormData({...formData, labRequired: !!v})} /> <Label>Lab Required</Label></div>
                <div><Label>Hours / Week</Label><Input value={formData.hoursPerWeek} onChange={e => setFormData({...formData, hoursPerWeek: e.target.value})} /></div>
                <div><Label>Assessment Method</Label><Input value={formData.assessmentMethod} onChange={e => setFormData({...formData, assessmentMethod: e.target.value})} /></div>
              </div>
              <div><Label>Remarks</Label><Input value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} /></div>
              <div><Label>Description</Label><Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <Button type="submit" className="w-full">{editingId ? "Update" : "Create"}</Button>
            </form>
          </div>
        </div>
      )}

      <Card><CardContent className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search subjects..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Type</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Course</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">College</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr> :
               data?.items?.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No subjects</td></tr> :
               data?.items?.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{s.subjectName} {s.subjectNameHi && <span className="text-xs text-gray-400 block">{s.subjectNameHi}</span>}</td>
                  <td className="py-2 px-3"><span className={`text-xs px-2 py-1 rounded-full ${s.courseType === 'honors' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{s.courseType}</span></td>
                  <td className="py-2 px-3 text-gray-500">{s.courseName}</td>
                  <td className="py-2 px-3 text-gray-500">{s.collegeName}</td>
                  <td className="py-2 px-3"><span className={`text-xs px-2 py-1 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.isActive ? "Active" : "Inactive"}</span></td>
                  <td className="py-2 px-3"><div className="flex gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8" 
                      onClick={() => { 
                        setEditingId(s.id); 
                        setFormData({ 
                          subjectName: s.subjectName, 
                          subjectNameHi: s.subjectNameHi ?? "", 
                          subjectCode: s.subjectCode ?? "", 
                          courseType: s.courseType as "honors" | "masters", 
                          courseId: String(s.courseId), 
                          collegeId: String(s.collegeId), 
                          credits: s.credits ? String(s.credits) : "", 
                          semester: s.semester ? String(s.semester) : "", 
                          theoryMarks: s.theoryMarks ? String(s.theoryMarks) : "", 
                          practicalMarks: s.practicalMarks ? String(s.practicalMarks) : "", 
                          totalMarks: s.totalMarks ? String(s.totalMarks) : "", 
                          isElective: !!s.isElective, 
                          prerequisites: s.prerequisites ?? "", 
                          learningOutcomes: s.learningOutcomes ?? "", 
                          syllabusUrl: s.syllabusUrl ?? "", 
                          referenceBooks: s.referenceBooks ?? "", 
                          labRequired: !!s.labRequired, 
                          hoursPerWeek: s.hoursPerWeek ? String(s.hoursPerWeek) : "", 
                          assessmentMethod: s.assessmentMethod ?? "", 
                          remarks: s.remarks ?? "", 
                          description: s.description ?? "", 
                        }); 
                        setDialogOpen(true); 
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: s.id })}><Power className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: s.id }); }}><Trash2 className="w-4 h-4" /></Button>
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
                <UploadCloud className="w-5 h-5 text-indigo-600 animate-bounce" />
                Import Subject Records
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
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold text-indigo-900 flex items-center gap-1.5">
                  📁 1. Download Template
                </h4>
                <p className="text-xs text-indigo-700 leading-relaxed">
                  To avoid import formatting errors, please download our standard sample Excel format, fill in the subject records, and then upload it.
                </p>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-1 bg-white hover:bg-slate-50 border-indigo-200 text-indigo-700 hover:text-indigo-800"
                  onClick={downloadSampleExcel}
                >
                  <Download className="w-3.5 h-3.5 mr-2" /> Download Sample Excel
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  📤 2. Upload File
                </h4>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50 relative">
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
                      <p className="text-sm font-semibold text-indigo-600 truncate max-w-xs mx-auto">{selectedFile.name}</p>
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
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5" 
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
