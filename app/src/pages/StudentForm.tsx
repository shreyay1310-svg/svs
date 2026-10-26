import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Save, CheckCircle, Lock, ArrowLeft, Send, FileText, Pen } from "lucide-react";
import { toast } from "sonner";

export default function StudentForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const studentId = id ? parseInt(id) : 0;
  const isNew = !studentId;
  const isSuperAdmin = user?.universityId === null;

  const { data: univData } = trpc.university.list.useQuery(
    { limit: 100 },
    { enabled: isSuperAdmin }
  );

  const [tab, setTab] = useState("academic");
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifyChecked, setVerifyChecked] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");

  const [formData, setFormData] = useState({
    rollNumber: "", enrollmentNumber: "", collegeId: "", courseId: "",
    subjectId: "", courseType: "" as "honors" | "masters" | "",
    name: "", nameHi: "", fatherName: "", fatherNameHi: "",
    motherName: "", motherNameHi: "", gender: "" as "male" | "female" | "other" | "",
    category: "" as "regular" | "private" | "ex" | "back" | "",
    division: "", passingYear: "", passingMonth: "",
    photoUrl: "", marksheetUrl: "", applicationLetterUrl: "",
    signatureData: "",
    email: "", mobile: "",
    universityId: "",
  });

  const [showUnlockOtpDialog, setShowUnlockOtpDialog] = useState(false);
  const [unlockEmailOtp, setUnlockEmailOtp] = useState("");
  const [unlockMobileOtp, setUnlockMobileOtp] = useState("");
  const [unlockOtpSent, setUnlockOtpSent] = useState(false);

  const allowReeditMutation = trpc.student.allowReedit.useMutation({
    onSuccess: () => {
      toast.success("Student profile unlocked for editing");
      utils.student.getById.invalidate();
      utils.student.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });



  const utils = trpc.useUtils();
  const { data: student, isLoading } = trpc.student.getById.useQuery(
    { id: studentId },
    { enabled: studentId > 0 },
  );
  const { data: collegesData } = trpc.college.list.useQuery(
    formData.universityId
      ? { universityId: parseInt(formData.universityId), page: 1, limit: 100 }
      : { page: 1, limit: 100 }
  );
  const { data: coursesData } = trpc.course.list.useQuery(
    formData.collegeId ? { collegeId: parseInt(formData.collegeId), page: 1, limit: 100 } : { page: 1, limit: 100 },
  );
  const { data: subjectsData } = trpc.subject.list.useQuery(
    formData.courseId && formData.courseType
      ? { courseId: parseInt(formData.courseId), courseType: formData.courseType as "honors" | "masters", page: 1, limit: 100 }
      : { page: 1, limit: 100 },
  );

  // UI fallbacks when DB is unseeded so selects show meaningful options during dev/demo
  const collegeItems = (collegesData && Array.isArray(collegesData.items) && collegesData.items.length > 0)
    ? collegesData.items
    : [{ id: 1, collegeName: "Rajasthan University" } as any];
  const courseItems = (coursesData && Array.isArray(coursesData.items) && coursesData.items.length > 0)
    ? coursesData.items
    : [{ id: 1, courseName: "Bachelor of Arts" } as any];
  const subjectItems = (subjectsData && Array.isArray(subjectsData.items) && subjectsData.items.length > 0)
    ? subjectsData.items
    : [{ id: 1, subjectName: "History" } as any];

  // If this is a new student and no selection made, prefill selects with the first fallback option
  useEffect(() => {
    if (!isNew) return;
    setFormData(prev => ({
      ...prev,
      collegeId: prev.collegeId || String(collegeItems[0].id),
      courseId: prev.courseId || String(courseItems[0].id),
      subjectId: prev.subjectId || String(subjectItems[0].id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  const createMutation = trpc.student.create.useMutation({
    onSuccess: () => { toast.success("Student created"); navigate("/students"); },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.student.update.useMutation({
    onSuccess: () => { toast.success("Saved"); utils.student.getById.invalidate(); utils.student.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const uploadMutation = trpc.student.uploadDocument.useMutation({
    onSuccess: () => { toast.success("Document uploaded"); utils.student.getById.invalidate(); },
  });

  const finalSubmitMutation = trpc.student.finalSubmit.useMutation({
    onSuccess: () => { toast.success("Form submitted successfully!"); utils.student.getById.invalidate(); utils.student.list.invalidate(); setShowOtpDialog(false); },
    onError: (err) => toast.error(err.message),
  });

  const sendDualOtpMutation = trpc.otp.sendDualOtp.useMutation({ 
    onSuccess: () => { 
      setOtpSent(true); 
      toast.success("OTPs sent to your email and mobile!"); 
    } 
  });

  const verifyDualOtpMutation = trpc.otp.verifyDualOtp.useMutation({
    onError: (err) => toast.error(err.message),
  });

  // Prevent students from creating new records
  useEffect(() => {
    if (isStudent && isNew) {
      toast.error("Students cannot create new records");
      navigate("/students");
    }
  }, [isStudent, isNew, navigate]);

  // Check if student is trying to access another student's profile
  useEffect(() => {
    if (isStudent && student && student.userId !== user?.id) {
      toast.error("You can only access your own profile");
      navigate("/students");
    }
  }, [student, isStudent, user?.id, navigate]);

  useEffect(() => {
    if (student) {
      setFormData({
        rollNumber: student.rollNumber ?? "",
        enrollmentNumber: student.enrollmentNumber ?? "",
        collegeId: student.collegeId ? String(student.collegeId) : "",
        courseId: student.courseId ? String(student.courseId) : "",
        subjectId: student.subjectId ? String(student.subjectId) : "",
        courseType: student.courseType ?? "",
        name: student.name ?? "",
        nameHi: student.nameHi ?? "",
        fatherName: student.fatherName ?? "",
        fatherNameHi: student.fatherNameHi ?? "",
        motherName: student.motherName ?? "",
        motherNameHi: student.motherNameHi ?? "",
        gender: student.gender ?? "",
        category: student.category ?? "",
        division: student.division ?? "",
        passingYear: student.passingYear ? String(student.passingYear) : "",
        passingMonth: student.passingMonth ?? "",
        photoUrl: student.photoUrl ?? "",
        marksheetUrl: student.marksheetUrl ?? "",
        applicationLetterUrl: student.applicationLetterUrl ?? "",
        signatureData: student.signatureData ?? "",
        email: student.userEmail ?? "",
        mobile: student.userMobile ?? "",
        universityId: student.universityId ? String(student.universityId) : "",
      });
    }
  }, [student]);

  useEffect(() => {
    // If college changes, reset dependent course and subject fields only when needed
    setFormData(prev => {
      if (prev.courseId === "" && prev.courseType === "" && prev.subjectId === "") {
        return prev;
      }
      return {
        ...prev,
        courseId: "",
        courseType: "",
        subjectId: "",
      };
    });
  }, [formData.collegeId]);

  useEffect(() => {
    // If course or course type changes, reset subject selection only when needed
    setFormData(prev => {
      if (prev.subjectId === "") {
        return prev;
      }
      return {
        ...prev,
        subjectId: "",
      };
    });
  }, [formData.courseId, formData.courseType]);



  const originalName = student?.name ?? "";
  const originalNameHi = student?.nameHi ?? "";
  const originalFatherName = student?.fatherName ?? "";
  const originalFatherNameHi = student?.fatherNameHi ?? "";
  const originalMotherName = student?.motherName ?? "";
  const originalMotherNameHi = student?.motherNameHi ?? "";
  const originalGender = student?.gender ?? "";
  const originalCategory = student?.category ?? "";
  const originalEmail = student?.userEmail ?? "";
  const originalMobile = student?.userMobile ?? "";
  const originalPhotoUrl = student?.photoUrl ?? "";

  const isPersonalDetailsChanged = 
    formData.name !== originalName ||
    formData.nameHi !== originalNameHi ||
    formData.fatherName !== originalFatherName ||
    formData.fatherNameHi !== originalFatherNameHi ||
    formData.motherName !== originalMotherName ||
    formData.motherNameHi !== originalMotherNameHi ||
    formData.gender !== originalGender ||
    formData.category !== originalCategory ||
    formData.email !== originalEmail ||
    formData.mobile !== originalMobile ||
    formData.photoUrl !== originalPhotoUrl;

  const isDocumentMissing = isPersonalDetailsChanged && (!formData.marksheetUrl || !formData.applicationLetterUrl);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rollNumber || !formData.enrollmentNumber || !formData.name || !formData.gender || !formData.category || !formData.email || !formData.mobile) {
      toast.error("Please fill all required fields"); return;
    }
    const payload: Record<string, unknown> = {
      rollNumber: formData.rollNumber,
      enrollmentNumber: formData.enrollmentNumber,
      collegeId: parseInt(formData.collegeId) || undefined,
      courseId: parseInt(formData.courseId) || undefined,
      subjectId: parseInt(formData.subjectId) || undefined,
      courseType: formData.courseType || undefined,
      name: formData.name,
      nameHi: formData.nameHi || undefined,
      fatherName: formData.fatherName || undefined,
      fatherNameHi: formData.fatherNameHi || undefined,
      motherName: formData.motherName || undefined,
      motherNameHi: formData.motherNameHi || undefined,
      gender: formData.gender || undefined,
      category: formData.category || undefined,
      division: formData.division || undefined,
      passingYear: formData.passingYear ? parseInt(formData.passingYear) : undefined,
      passingMonth: formData.passingMonth || undefined,
      signatureData: formData.signatureData || undefined,
      photoUrl: formData.photoUrl || undefined,
      marksheetUrl: formData.marksheetUrl || undefined,
      applicationLetterUrl: formData.applicationLetterUrl || undefined,
      email: formData.email,
      mobile: formData.mobile,
    };
    if (isSuperAdmin && formData.universityId) {
      payload.universityId = parseInt(formData.universityId);
    }
    if (isNew) createMutation.mutate(payload as Parameters<typeof createMutation.mutate>[0]);
    else updateMutation.mutate({ id: studentId, ...payload } as Parameters<typeof updateMutation.mutate>[0]);
  };

  const handleFileUpload = (field: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (studentId) {
        uploadMutation.mutate({ id: studentId, [field]: result });
      }
      setFormData(prev => ({ ...prev, [field]: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSendOtp = async () => {
    const email = formData.email || undefined;
    const mobile = formData.mobile || undefined;
    if (!email && !mobile) { 
      toast.error("Please enter email and mobile number before sending OTP."); 
      return; 
    }
    try {
      await sendDualOtpMutation.mutateAsync({ 
        email, 
        mobile,
        purpose: "final_submit" 
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTPs");
    }
  };

  const handleVerifyOtp = async () => {
    const email = formData.email || undefined;
    const mobile = formData.mobile || undefined;
    
    // Check if required OTPs are provided
    if (email && !emailOtp) { 
      toast.error("Please enter email OTP"); 
      return; 
    }
    if (mobile && !mobileOtp) { 
      toast.error("Please enter mobile OTP"); 
      return; 
    }

    try {
      // Verify both OTPs
      const result = await verifyDualOtpMutation.mutateAsync({ 
        email: email || undefined,
        emailOtp: email ? emailOtp : undefined,
        mobile: mobile || undefined,
        mobileOtp: mobile ? mobileOtp : undefined,
        purpose: "final_submit" 
      });

      // If both verified successfully, submit the form
      if (result.success) {
        // Save form changes first so email/mobile updates match
        const payload: Record<string, unknown> = {
          rollNumber: formData.rollNumber,
          enrollmentNumber: formData.enrollmentNumber,
          collegeId: parseInt(formData.collegeId) || undefined,
          courseId: parseInt(formData.courseId) || undefined,
          subjectId: parseInt(formData.subjectId) || undefined,
          courseType: formData.courseType || undefined,
          name: formData.name,
          nameHi: formData.nameHi || undefined,
          fatherName: formData.fatherName || undefined,
          fatherNameHi: formData.fatherNameHi || undefined,
          motherName: formData.motherName || undefined,
          motherNameHi: formData.motherNameHi || undefined,
          gender: formData.gender || undefined,
          category: formData.category || undefined,
          division: formData.division || undefined,
          passingYear: formData.passingYear ? parseInt(formData.passingYear) : undefined,
          passingMonth: formData.passingMonth || undefined,
          signatureData: formData.signatureData || undefined,
          photoUrl: formData.photoUrl || undefined,
          marksheetUrl: formData.marksheetUrl || undefined,
          applicationLetterUrl: formData.applicationLetterUrl || undefined,
          email: formData.email,
          mobile: formData.mobile,
        };
        if (isSuperAdmin && formData.universityId) {
          payload.universityId = parseInt(formData.universityId);
        }
        await updateMutation.mutateAsync({ id: studentId, ...payload } as any);
        finalSubmitMutation.mutate({ id: studentId });
        setShowOtpDialog(false);
        setOtpSent(false);
        setEmailOtp("");
        setMobileOtp("");
      }
    } catch (err: any) {
      toast.error(err?.message || "OTP verification failed");
    }
  };

  const handleSendUnlockOtp = async () => {
    const email = user?.email ?? undefined;
    const mobile = user?.mobile ?? undefined;
    if (!email && !mobile) {
      toast.error("You have no email or mobile number configured on your account. Cannot send OTP.");
      return;
    }
    try {
      await sendDualOtpMutation.mutateAsync({
        email,
        mobile,
        purpose: "final_submit",
      });
      setUnlockOtpSent(true);
      toast.success("OTP sent to your email and mobile!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTP");
    }
  };

  const handleVerifyAndUnlock = async () => {
    allowReeditMutation.mutate({
      id: studentId,
      emailOtp: user?.email ? unlockEmailOtp : undefined,
      mobileOtp: user?.mobile ? unlockMobileOtp : undefined,
    }, {
      onSuccess: () => {
        setShowUnlockOtpDialog(false);
        setUnlockOtpSent(false);
        setUnlockEmailOtp("");
        setUnlockMobileOtp("");
      }
    });
  };

  const isLocked = student?.isLocked ?? false;
  const canEdit = isNew || !isLocked || (student?.canReedit ?? false) || !isStudent;
  // Students can NEVER edit academic details, only admins/staff can
  const canEditAcademic = !isStudent && (isNew || !isLocked || (student?.canReedit ?? false));
  // Students can edit personal details unless form is locked
  const canEditPersonal = isStudent ? (!isLocked || (student?.canReedit ?? false)) : (isNew || !isLocked || (student?.canReedit ?? false));
  // Students can edit documents unless form is locked
  const canEditDocuments = isStudent ? (!isLocked || (student?.canReedit ?? false)) : (isNew || !isLocked || (student?.canReedit ?? false));

  if (isLoading && studentId > 0) return <div className="text-center py-8">Loading...</div>;

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? "Add Student" : isStudent ? "My Profile" : "Edit Student"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isLocked && (
            <span className="flex items-center gap-1 text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
              <Lock className="w-4 h-4" /> Submitted & Locked
            </span>
          )}
          {!isStudent && isLocked && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
              onClick={() => { setShowUnlockOtpDialog(true); setUnlockOtpSent(false); setUnlockEmailOtp(""); setUnlockMobileOtp(""); }}
              disabled={allowReeditMutation.isPending}
            >
              <Pen className="w-4 h-4 mr-1" /> Unlock Profile
            </Button>
          )}
        </div>
      </div>

      {student?.verificationStatus === "rejected" && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm animate-slide-in">
          <div className="font-bold flex items-center gap-1.5 text-base">
            ⚠️ Submission Rejected by Administrator
          </div>
          <p className="mt-1 text-xs">Reason: <strong className="font-semibold">{student.rejectionReason}</strong></p>
          <p className="mt-1.5 text-[11px] text-red-600">Please review, edit the corrected details or re-upload files below, and re-submit the form.</p>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Native tabs */}
        <div className={`grid w-full ${(isStudent || !isNew) ? 'grid-cols-4' : 'grid-cols-2'} bg-gray-100 rounded-lg p-1`}>
          {[
            { key: "academic", label: "Academic" },
            { key: "personal", label: "Personal" },
            { key: "documents", label: "Documents" },
            { key: "submission", label: "Submission", disabled: isNew },
          ].filter(t => isStudent || !isNew || t.key === "academic" || t.key === "personal").map((t) => (
            <button
              key={t.key}
              type="button"
              disabled={t.disabled}
              onClick={() => setTab(t.key)}
              className={`py-2 text-sm font-medium rounded-md transition-colors ${
                tab === t.key ? "bg-white text-gray-900 shadow" : "text-gray-600 hover:text-gray-900"
              } ${t.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Academic Tab */}
        {tab === "academic" && (
          <div className="space-y-4 mt-4">
            {isStudent && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">Academic Details (Read-Only)</h3>
                  <p className="text-sm text-blue-700 mt-1">Your academic information is managed by administrators. Contact your institution to make changes to these details.</p>
                </div>
              </div>
            )}
            <Card><CardContent className="p-4 space-y-3">
              {isSuperAdmin && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>University *</Label>
                    <select
                      value={formData.universityId}
                      onChange={e => canEditAcademic && setFormData({...formData, universityId: e.target.value, collegeId: "", courseId: "", subjectId: ""})}
                      disabled={!canEditAcademic}
                      className={`w-full border rounded-md px-3 py-2 text-sm bg-white ${!canEditAcademic ? "bg-gray-50 cursor-not-allowed" : ""}`}
                      required
                    >
                      <option value="">Select University</option>
                      {univData?.items.map(u => <option key={u.id} value={String(u.id)}>{u.universityName}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Roll Number *</Label><Input value={formData.rollNumber} onChange={e => canEditAcademic && setFormData({...formData, rollNumber: e.target.value})} required disabled={!canEditAcademic} className={!canEditAcademic ? "bg-gray-50 cursor-not-allowed" : ""} /></div>
                <div><Label>Enrollment Number *</Label><Input value={formData.enrollmentNumber} onChange={e => canEditAcademic && setFormData({...formData, enrollmentNumber: e.target.value})} required disabled={!canEditAcademic} className={!canEditAcademic ? "bg-gray-50 cursor-not-allowed" : ""} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>College *</Label>
                  <select
                    value={formData.collegeId}
                    onChange={e => canEditAcademic && setFormData({...formData, collegeId: e.target.value})}
                    disabled={!canEditAcademic}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${!canEditAcademic ? "bg-gray-50 cursor-not-allowed" : ""}`}
                  >
                    <option value="">Select college</option>
                    {collegeItems.map(c => <option key={c.id} value={String(c.id)}>{c.collegeName}</option>)}
                  </select>
                </div>
                <div><Label>Course *</Label>
                  <select
                    value={formData.courseId}
                    onChange={e => canEditAcademic && setFormData({...formData, courseId: e.target.value})}
                    disabled={!canEditAcademic}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${!canEditAcademic ? "bg-gray-50 cursor-not-allowed" : ""}`}
                  >
                    <option value="">Select course</option>
                    {courseItems.map(c => <option key={c.id} value={String(c.id)}>{c.courseName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Course Type</Label>
                  <select
                    value={formData.courseType}
                    onChange={e => canEditAcademic && setFormData({...formData, courseType: e.target.value as "honors" | "masters"})}
                    disabled={!canEditAcademic}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${!canEditAcademic ? "bg-gray-50 cursor-not-allowed" : ""}`}
                  >
                    <option value="">Select</option>
                    <option value="honors">Honors</option>
                    <option value="masters">Masters</option>
                  </select>
                </div>
                <div><Label>Subject</Label>
                  <select
                    value={formData.subjectId}
                    onChange={e => canEditAcademic && setFormData({...formData, subjectId: e.target.value})}
                    disabled={!canEditAcademic}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${!canEditAcademic ? "bg-gray-50 cursor-not-allowed" : ""}`}
                  >
                    <option value="">Select subject</option>
                    {subjectItems.map(s => <option key={s.id} value={String(s.id)}>{s.subjectName}</option>)}
                  </select>
                </div>
                <div><Label>Division</Label><Input value={formData.division} onChange={e => canEditAcademic && setFormData({...formData, division: e.target.value})} disabled={!canEditAcademic} className={!canEditAcademic ? "bg-gray-50 cursor-not-allowed" : ""} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Passing Year</Label><Input type="number" value={formData.passingYear} onChange={e => canEditAcademic && setFormData({...formData, passingYear: e.target.value})} disabled={!canEditAcademic} className={!canEditAcademic ? "bg-gray-50 cursor-not-allowed" : ""} /></div>
                <div><Label>Passing Month</Label>
                  <select
                    value={formData.passingMonth}
                    onChange={e => canEditAcademic && setFormData({...formData, passingMonth: e.target.value})}
                    disabled={!canEditAcademic}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${!canEditAcademic ? "bg-gray-50 cursor-not-allowed" : ""}`}
                  >
                    <option value="">Select month</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </CardContent></Card>
          </div>
        )}

        {/* Personal Tab */}
        {tab === "personal" && (
          <div className="space-y-4 mt-4">
            <Card><CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Full Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required disabled={!canEditPersonal} /></div>
                <div><Label>Name (Hindi - Devlys 100)</Label><Input value={formData.nameHi} onChange={e => setFormData({...formData, nameHi: e.target.value})} placeholder="देवल्य्स १०० फ़ॉन्ट" disabled={!canEditPersonal} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Father&apos;s Name</Label><Input value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} disabled={!canEditPersonal} /></div>
                <div><Label>Father&apos;s Name (Hindi)</Label><Input value={formData.fatherNameHi} onChange={e => setFormData({...formData, fatherNameHi: e.target.value})} placeholder="देवल्य्स १००" disabled={!canEditPersonal} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Mother&apos;s Name</Label><Input value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} disabled={!canEditPersonal} /></div>
                <div><Label>Mother&apos;s Name (Hindi)</Label><Input value={formData.motherNameHi} onChange={e => setFormData({...formData, motherNameHi: e.target.value})} placeholder="देवल्य्स १००" disabled={!canEditPersonal} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Gender *</Label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value as "male" | "female" | "other"})}
                    disabled={!canEditPersonal}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><Label>Category *</Label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as "regular" | "private" | "ex" | "back"})}
                    disabled={!canEditPersonal}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select</option>
                    <option value="regular">Regular</option>
                    <option value="private">Private</option>
                    <option value="ex">Ex</option>
                    <option value="back">Back</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label>Email Address *</Label>
                  <Input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    required 
                    disabled={!canEditPersonal} 
                    placeholder="student@example.com"
                  />
                </div>
                <div>
                  <Label>Mobile Number *</Label>
                  <Input 
                    value={formData.mobile} 
                    onChange={e => setFormData({...formData, mobile: e.target.value})} 
                    required 
                    disabled={!canEditPersonal} 
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </CardContent></Card>
          </div>
        )}

        {/* Documents Tab */}
        {tab === "documents" && (
          <div className="space-y-4 mt-4">
            <Card><CardContent className="p-4 space-y-4">
              <div>
                <Label>Photo</Label>
                <div className="flex items-center gap-3 mt-1">
                  {formData.photoUrl && <img src={formData.photoUrl} alt="Student" className="w-20 h-20 object-cover rounded-lg border" />}
                  <div className="flex flex-col gap-2">
                    <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload("photoUrl", e.target.files[0])} disabled={!canEditDocuments} />
                    {formData.photoUrl && canEditDocuments && (
                      <Button type="button" variant="outline" size="sm" onClick={() => { setFormData(prev => ({ ...prev, photoUrl: "" })); if (studentId) uploadMutation.mutate({ id: studentId, photoUrl: "" }); }}>
                        Remove Photo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label>10th Class Marksheet / Marksheet *</Label>
                <span className="text-xs text-gray-500 block">Required if personal details or photo are modified</span>
                <div className="flex items-center gap-3 mt-1">
                  {formData.marksheetUrl && <a href={formData.marksheetUrl} target="_blank" className="text-blue-600 text-sm font-medium" rel="noreferrer">View Marksheet</a>}
                  <Input type="file" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && handleFileUpload("marksheetUrl", e.target.files[0])} disabled={!canEditDocuments} />
                </div>
              </div>
              <div>
                <Label>Signed University Application Letter *</Label>
                <span className="text-xs text-gray-500 block">Required if personal details or photo are modified</span>
                <div className="flex items-center gap-3 mt-1">
                  {formData.applicationLetterUrl && <a href={formData.applicationLetterUrl} target="_blank" className="text-blue-600 text-sm font-medium" rel="noreferrer">View Letter</a>}
                  <Input type="file" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && handleFileUpload("applicationLetterUrl", e.target.files[0])} disabled={!canEditDocuments} />
                </div>
              </div>

            </CardContent></Card>
          </div>
        )}

        {/* Submission Tab */}
        {tab === "submission" && (
          <div className="space-y-4 mt-4">
            <Card><CardContent className="p-4 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">🔍 Preview & Final Submission</h3>
                <p className="text-sm text-yellow-700 mb-3">Please review all details carefully before final submission. Once submitted, the form will be locked and you cannot edit without administrator permission.</p>

                <div className="bg-white rounded-lg p-3 space-y-2 text-sm border border-yellow-100">
                  <h4 className="font-semibold text-gray-700 mb-2">Summary of Your Information</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500 text-xs">Roll Number</span>
                      <div className="font-medium text-gray-800">{formData.rollNumber}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Enrollment</span>
                      <div className="font-medium text-gray-800">{formData.enrollmentNumber}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 text-xs">Name</span>
                      <div className="font-medium text-gray-800">{formData.name}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Father's Name</span>
                      <div className="font-medium text-gray-800">{formData.fatherName || "—"}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Mother's Name</span>
                      <div className="font-medium text-gray-800">{formData.motherName || "—"}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Gender</span>
                      <div className="font-medium capitalize text-gray-800">{formData.gender || "—"}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Category</span>
                      <div className="font-medium capitalize text-gray-800">{formData.category || "—"}</div>
                    </div>
                  </div>
                </div>

                {formData.photoUrl && (
                  <div className="mt-3 p-2 bg-purple-50 border border-purple-100 rounded">
                    <p className="text-xs text-purple-700 mb-1">📷 Photo Uploaded</p>
                    <img src={formData.photoUrl} alt="Preview" className="h-24 w-20 object-cover rounded border" />
                  </div>
                )}

                <div className="mt-4 flex items-start gap-2">
                  <input
                    id="verify"
                    type="checkbox"
                    checked={verifyChecked}
                    onChange={e => setVerifyChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-yellow-600"
                  />
                  <label htmlFor="verify" className="text-sm text-yellow-800 leading-relaxed">
                    I verify that all the information provided is correct and complete. Any errors or omissions are my responsibility.
                  </label>
                </div>

                {isDocumentMissing && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium p-3 rounded-md mb-3 leading-relaxed animate-pulse">
                    ⚠️ You have modified your personal details, email, mobile, or photo. You must upload both your 10th Class Marksheet and a Signed University Application Letter in the Documents tab before you can perform the final submission.
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  {!isLocked ? (
                    isStudent ? (
                      <Button 
                        type="button" 
                        className="flex-1 bg-green-600 hover:bg-green-700" 
                        onClick={() => setShowOtpDialog(true)} 
                        disabled={!verifyChecked || isDocumentMissing}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Final Submit with OTP
                      </Button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
                        <Lock className="w-5 h-5 text-amber-600" />
                        <span className="font-medium text-sm">Waiting for student to perform final submission with OTP.</span>
                      </div>
                    )
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 bg-green-100 border border-green-300 rounded-lg p-3">
                      <Lock className="w-5 h-5 text-green-700" />
                      <span className="font-medium text-green-700">Form Submitted & Locked</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent></Card>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {canEdit && (
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> {isNew ? "Create" : "Save Changes"}
            </Button>
          )}
          {!isNew && !isLocked && isStudent && (
            <Button type="button" variant="outline" onClick={() => setTab("submission")}>
              <FileText className="w-4 h-4 mr-1" /> Go to Submission
            </Button>
          )}
        </div>
      </form>

      {/* OTP Dialog - native modal */}
      {showOtpDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Verify & Submit Form</h3>
              <button type="button" onClick={() => { setShowOtpDialog(false); setOtpSent(false); setEmailOtp(""); setMobileOtp(""); }} className="text-gray-500 hover:text-gray-700">&times;</button>
            </div>
            
            {!otpSent ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    <strong>One-time passwords</strong> will be sent to the student's email and mobile for final verification.
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  {formData.email && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500">📧 Email:</span>
                      <span className="font-medium">{formData.email}</span>
                    </div>
                  )}
                  {formData.mobile && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500">📱 Mobile:</span>
                      <span className="font-medium">{formData.mobile}</span>
                    </div>
                  )}
                  {!formData.email && !formData.mobile && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-red-700 text-sm">⚠️ Student has no email or mobile number on record.</p>
                    </div>
                  )}
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleSendOtp} 
                  disabled={sendDualOtpMutation.isPending || (!formData.email && !formData.mobile)}
                >
                  <Send className="w-4 h-4 mr-1" /> Send OTPs
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-900 font-medium">✓ OTPs have been sent!</p>
                  <p className="text-xs text-green-700 mt-1">Enter the codes below to complete submission.</p>
                </div>

                {student?.userEmail && (
                  <div>
                    <Label className="flex items-center gap-1">
                      📧 Email OTP <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      value={emailOtp} 
                      onChange={e => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} 
                      placeholder="000000" 
                      maxLength={6}
                      className="mt-1 font-mono text-center text-lg tracking-widest"
                    />
                  </div>
                )}

                {student?.userMobile && (
                  <div>
                    <Label className="flex items-center gap-1">
                      📱 Mobile OTP <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      value={mobileOtp} 
                      onChange={e => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} 
                      placeholder="000000" 
                      maxLength={6}
                      className="mt-1 font-mono text-center text-lg tracking-widest"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setOtpSent(false); setEmailOtp(""); setMobileOtp(""); }}
                  >
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleVerifyOtp} 
                    disabled={verifyDualOtpMutation.isPending || finalSubmitMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Verify & Submit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Staff Unlock OTP Dialog */}
      {showUnlockOtpDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Staff OTP Verification</h3>
              <button 
                type="button" 
                onClick={() => { setShowUnlockOtpDialog(false); setUnlockOtpSent(false); setUnlockEmailOtp(""); setUnlockMobileOtp(""); }} 
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
    </div>
  );
}
