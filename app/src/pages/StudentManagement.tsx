import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Eye, Pencil, Trash2, Download, UploadCloud, Lock, X } from "lucide-react";
import { toast } from "sonner";

export default function StudentManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");

  // Detailed View & Unlock states
  const [viewStudent, setViewStudent] = useState<any | null>(null);
  const [unlockStudentId, setUnlockStudentId] = useState<number | null>(null);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockEmailOtp, setUnlockEmailOtp] = useState("");
  const [unlockMobileOtp, setUnlockMobileOtp] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [unlockOtpSent, setUnlockOtpSent] = useState(false);
  const [rejectReasonOpen, setRejectReasonOpen] = useState(false);
  const [rejectReasonText, setRejectReasonText] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.student.list.useQuery({
    search: search || undefined,
    category: (categoryFilter as "regular" | "private" | "ex" | "back") || undefined,
    page,
    limit: 20,
  });

  const sendDualOtpMutation = trpc.otp.sendDualOtp.useMutation({
    onSuccess: () => {
      setUnlockOtpSent(true);
      toast.success("OTP sent to your email and mobile!");
    },
    onError: (err) => toast.error(err.message),
  });

  const allowReeditMutation = trpc.student.allowReedit.useMutation({
    onSuccess: () => {
      toast.success("Student profile unlocked successfully");
      utils.student.list.invalidate();
      setUnlockDialogOpen(false);
      setUnlockStudentId(null);
      setUnlockOtpSent(false);
      setUnlockEmailOtp("");
      setUnlockMobileOtp("");
    },
    onError: (err) => toast.error(err.message),
  });

  const approveProfileMutation = trpc.student.approveProfile.useMutation({
    onSuccess: () => {
      toast.success("Student profile approved successfully!");
      utils.student.list.invalidate();
      setViewStudent(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectProfileMutation = trpc.student.rejectProfile.useMutation({
    onSuccess: () => {
      toast.success("Student profile rejected and unlocked.");
      utils.student.list.invalidate();
      setViewStudent(null);
      setRejectReasonOpen(false);
      setRejectReasonText("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSendUnlockOtp = async () => {
    const email = user?.email ?? undefined;
    const mobile = user?.mobile ?? undefined;
    if (!email && !mobile) {
      toast.error("No email or mobile number configured on your account. Cannot send OTP.");
      return;
    }
    await sendDualOtpMutation.mutateAsync({
      email,
      mobile,
      purpose: "final_submit",
    });
  };

  const handleVerifyAndUnlock = async () => {
    if (!unlockStudentId) return;
    allowReeditMutation.mutate({
      id: unlockStudentId,
      emailOtp: user?.email ? unlockEmailOtp : undefined,
      mobileOtp: user?.mobile ? unlockMobileOtp : undefined,
    });
  };

  // Redirect student to their profile page
  useEffect(() => {
    if (isStudent && data?.items && data.items.length > 0) {
      navigate(`/student-form/${data.items[0].id}`);
    }
  }, [isStudent, data, navigate]);

  const deleteMutation = trpc.student.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); utils.student.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const createMutation = trpc.student.create.useMutation({ onSuccess: () => { toast.success("Student created"); utils.student.list.invalidate(); }, onError: (err) => toast.error(err.message) });

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

  const importStudents = async (content: string) => {
    setImporting(true);
    try {
      const rows = parseCsv(content);
      for (const r of rows) {
        if (!r.rollnumber && !r.roll_number) throw new Error("Each row must include rollNumber");
        const rollNumber = r.rollnumber || r.roll_number;
        const enrollmentNumber = r.enrollmentnumber || r.enrollment_number || ("ENR" + Math.floor(100000 + Math.random() * 900000));
        const collegeId = r.collegeid ? parseInt(r.collegeid) : (r.college_id ? parseInt(r.college_id) : 1);
        const courseId = r.courseid ? parseInt(r.courseid) : (r.course_id ? parseInt(r.course_id) : 1);
        const name = r.name || r.studentname || r.student_name || "Student Name";
        const gender = (r.gender || "male") as "male" | "female" | "other";
        const category = (r.category || "regular") as "regular" | "private" | "ex" | "back";

        await createMutation.mutateAsync({
          rollNumber,
          enrollmentNumber,
          collegeId,
          courseId,
          subjectId: r.subjectid ? parseInt(r.subjectid) : (r.subject_id ? parseInt(r.subject_id) : undefined),
          courseType: (r.coursetype as any) || undefined,
          name,
          nameHi: r.namehi || r.name_hi || undefined,
          fatherName: r.fathername || r.father_name || undefined,
          motherName: r.mothername || r.mother_name || undefined,
          gender,
          category,
          division: r.division || undefined,
          passingYear: r.passingyear ? parseInt(r.passingyear) : undefined,
          passingMonth: r.passingmonth || undefined,
        });
      }
      toast.success("Imported students successfully");
      utils.student.list.invalidate();
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
      "roll_number",
      "enrollment_number",
      "college_id",
      "course_id",
      "subject_id",
      "course_type",
      "name",
      "gender",
      "category",
      "father_name",
      "mother_name",
      "division",
      "passing_year",
      "passing_month"
    ];
    const sampleRow = [
      "10001",
      "ENR99999",
      "1",
      "1",
      "",
      "honors",
      "Sample Student",
      "male",
      "regular",
      "Father Name",
      "Mother Name",
      "first",
      "2026",
      "June"
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "student_import_sample.xlsx");
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
      const success = await importStudents(csv);
      if (success) {
        setImportDialogOpen(false);
        setSelectedFile(null);
      }
    } catch (err: any) {
      toast.error("Failed to parse file: " + err.message);
    }
  };

  const exportToCSV = () => {
    if (!data?.items) return;
    const headers = ["ID", "Roll Number", "Enrollment", "Name", "Father", "Mother", "Gender", "Category", "College", "Course", "Division"];
    const rows = data.items.map((s) => [s.id, s.rollNumber, s.enrollmentNumber, s.name, s.fatherName, s.motherName, s.gender, s.category, s.collegeName, s.courseName, s.division]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students.csv"; a.click();
    toast.success("Exported to CSV");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{isStudent ? "My Profile" : "Student Management"}</h1>
        {!isStudent && (
          <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}><Download className="w-4 h-4 mr-1" /> Export</Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setImportDialogOpen(true); }}><UploadCloud className="w-4 h-4 mr-1" /> Import</Button>
              <Button size="sm" onClick={() => navigate("/student-form")}><Plus className="w-4 h-4 mr-1" /> Add Student</Button>
            </div>
        )}
      </div>

      <Card><CardContent className="p-4">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search students..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <select 
            value={categoryFilter} 
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="w-36 border rounded px-2 text-sm bg-white"
          >
            <option value="">All Categories</option>
            <option value="regular">Regular</option>
            <option value="private">Private</option>
            <option value="ex">Ex</option>
            <option value="back">Back</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-500">Roll No</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">College</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Course</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Category</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="text-center py-8">Loading...</td></tr> :
               data?.items.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-500">No students found</td></tr> :
               data?.items.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{s.rollNumber}</td>
                  <td className="py-2 px-3">{s.name}</td>
                  <td className="py-2 px-3 text-gray-500">{s.collegeName}</td>
                  <td className="py-2 px-3 text-gray-500">{s.courseName}</td>
                  <td className="py-2 px-3"><span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">{s.category}</span></td>
                  <td className="py-2 px-3">
                    {s.verificationStatus === "approved" ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">Approved</span>
                    ) : s.verificationStatus === "rejected" ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">Rejected</span>
                    ) : s.verificationStatus === "submitted" ? (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold animate-pulse">Awaiting Approval</span>
                    ) : s.canReedit ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">Re-edit Allowed</span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">Draft</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      {/* View details modal */}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-indigo-600 hover:text-indigo-800" 
                        onClick={() => setViewStudent(s)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* Edit student profile page */}
                      {(!s.isLocked || s.canReedit || !isStudent) && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-800" 
                          onClick={() => navigate(`/student-form/${s.id}`)}
                          title="Edit Details"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Unlock Profile button */}
                      {!isStudent && s.isLocked && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-orange-600 hover:text-orange-800 animate-pulse" 
                          onClick={() => {
                            setUnlockStudentId(s.id);
                            setUnlockOtpSent(false);
                            setUnlockEmailOtp("");
                            setUnlockMobileOtp("");
                            setUnlockDialogOpen(true);
                          }}
                          title="Unlock Student Profile"
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Delete button */}
                      {!isStudent && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-500 hover:text-red-700" 
                          onClick={() => { if (confirm("Are you sure you want to delete this student record?")) deleteMutation.mutate({ id: s.id }); }}
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
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
      {/* Detailed Student View Modal */}
      {viewStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Student Detailed Record</h3>
                <p className="text-xs text-slate-500">Roll No: {viewStudent.rollNumber} | Enrollment: {viewStudent.enrollmentNumber}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setViewStudent(null)} 
                className="text-gray-500 hover:text-gray-700 text-2xl font-semibold"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Photo & Basic Status */}
              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                {viewStudent.photoUrl ? (
                  <img src={viewStudent.photoUrl} alt="Photo" className="w-32 h-40 object-cover rounded-lg shadow-md border" />
                ) : (
                  <div className="w-32 h-40 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 font-medium">No Photo</div>
                )}
                <div className="mt-3 text-center space-y-1">
                  <h4 className="font-bold text-slate-800 text-lg">{viewStudent.name}</h4>
                  <p className="text-xs text-indigo-600 font-semibold">{viewStudent.collegeName}</p>
                  <div className="pt-2">
                    {viewStudent.verificationStatus === "approved" ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1 border border-emerald-200">
                        ✓ Approved & Locked
                      </span>
                    ) : viewStudent.verificationStatus === "rejected" ? (
                      <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1 border border-red-200">
                        ✗ Rejected: {viewStudent.rejectionReason}
                      </span>
                    ) : viewStudent.verificationStatus === "submitted" ? (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1 border border-indigo-200 animate-pulse">
                        ⌛ Awaiting Approval
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1 border border-yellow-200">
                        ⚡ Draft Mode
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact & Personal details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-700 border-b pb-1">Personal Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Name (Hindi)</span>
                    <p className="font-medium text-slate-800">{viewStudent.nameHi || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Gender</span>
                    <p className="font-medium text-slate-800 capitalize">{viewStudent.gender}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Father's Name</span>
                    <p className="font-medium text-slate-800">{viewStudent.fatherName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Mother's Name</span>
                    <p className="font-medium text-slate-800">{viewStudent.motherName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Category</span>
                    <p className="font-medium text-slate-800 capitalize">{viewStudent.category}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Division</span>
                    <p className="font-medium text-slate-800">{viewStudent.division || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Email Address</span>
                    <p className="font-medium text-slate-800">{viewStudent.userEmail || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Mobile Number</span>
                    <p className="font-medium text-slate-800">{viewStudent.userMobile || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <h4 className="font-semibold text-slate-700 border-b pb-1 text-sm">Academic Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Course</span>
                  <p className="font-medium text-slate-800">{viewStudent.courseName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Course Type</span>
                  <p className="font-medium text-slate-800 capitalize">{viewStudent.courseType || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Subject</span>
                  <p className="font-medium text-slate-800">{viewStudent.subjectName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Passing Year</span>
                  <p className="font-medium text-slate-800">{viewStudent.passingYear || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Passing Month</span>
                  <p className="font-medium text-slate-800">{viewStudent.passingMonth || "—"}</p>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-700 border-b pb-1 text-sm">Verification Documents</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">10th Class Marksheet / Marksheet</span>
                  {viewStudent.marksheetUrl ? (
                    <a href={viewStudent.marksheetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium">
                      <span>View Marksheet File</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Not Uploaded</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Signed University Application Letter</span>
                  {viewStudent.applicationLetterUrl ? (
                    <a href={viewStudent.applicationLetterUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium">
                      <span>View Application Letter</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Not Uploaded</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <div className="flex gap-2">
                {!isStudent && viewStudent.verificationStatus === "submitted" && (
                  <>
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      onClick={() => approveProfileMutation.mutate({ id: viewStudent.id })}
                      disabled={approveProfileMutation.isPending}
                    >
                      {approveProfileMutation.isPending ? "Approving..." : "✓ Approve Form"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      onClick={() => setRejectReasonOpen(true)}
                    >
                      ✗ Reject Form
                    </Button>
                  </>
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => setViewStudent(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Unlock OTP Dialog */}
      {unlockDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Staff OTP Verification</h3>
              <button 
                type="button" 
                onClick={() => { setUnlockDialogOpen(false); setUnlockOtpSent(false); setUnlockEmailOtp(""); setUnlockMobileOtp(""); }} 
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            {!unlockOtpSent ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    To unlock this student profile, verify your identity. An OTP will be sent to your registered contact details.
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  {user?.email && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500">📧 Email:</span>
                      <span className="font-medium">{user.email}</span>
                    </div>
                  )}
                  {user?.mobile && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500">📱 Mobile:</span>
                      <span className="font-medium">{user.mobile}</span>
                    </div>
                  )}
                </div>
                <Button 
                  className="w-full animate-pulse" 
                  onClick={handleSendUnlockOtp} 
                  disabled={sendDualOtpMutation.isPending}
                >
                  Send OTP Codes
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-900 font-medium">✓ OTPs sent to your email/mobile</p>
                </div>

                {user?.email && (
                  <div>
                    <Label className="flex items-center gap-1">
                      📧 Email OTP *
                    </Label>
                    <Input 
                      value={unlockEmailOtp} 
                      onChange={e => setUnlockEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} 
                      placeholder="000000" 
                      maxLength={6}
                      className="mt-1 font-mono text-center text-lg tracking-widest text-slate-800"
                    />
                  </div>
                )}

                {user?.mobile && (
                  <div>
                    <Label className="flex items-center gap-1">
                      📱 Mobile OTP *
                    </Label>
                    <Input 
                      value={unlockMobileOtp} 
                      onChange={e => setUnlockMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} 
                      placeholder="000000" 
                      maxLength={6}
                      className="mt-1 font-mono text-center text-lg tracking-widest text-slate-800"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setUnlockOtpSent(false); setUnlockEmailOtp(""); setUnlockMobileOtp(""); }}
                  >
                    Back
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white" 
                    onClick={handleVerifyAndUnlock} 
                    disabled={allowReeditMutation.isPending}
                  >
                    Verify & Unlock
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {importDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600 animate-bounce" />
                Import Student Records
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
                  To avoid import formatting errors, please download our standard sample Excel format, fill in the student records, and then upload it.
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
      {/* Reject Reason Dialog */}
      {rejectReasonOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 space-y-4 animate-scale-in">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Reject Student Submission</h3>
              <p className="text-xs text-slate-500 mt-1">Please specify the reason for rejecting this profile. The student will see this message and must correct their details.</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600">Rejection Reason *</Label>
              <textarea
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                placeholder="e.g. 10th marksheet image is blurry, please re-upload."
                required
                className="mt-1.5 w-full h-24 border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectReasonOpen(false);
                  setRejectReasonText("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                disabled={!rejectReasonText.trim() || rejectProfileMutation.isPending}
                onClick={() => {
                  if (viewStudent) {
                    rejectProfileMutation.mutate({
                      id: viewStudent.id,
                      reason: rejectReasonText.trim(),
                    });
                  }
                }}
              >
                {rejectProfileMutation.isPending ? "Rejecting..." : "Submit Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
