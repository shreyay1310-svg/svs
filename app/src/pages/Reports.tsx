import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileBarChart, Users, PieChart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function Reports() {
  const { user } = useAuth();
  const isSuperAdmin = user?.universityId === null;

  const [filters, setFilters] = useState({
    collegeId: "", courseId: "", subjectId: "", passingYear: "", category: "", universityId: "",
  });
  const [page, setPage] = useState(1);

  const { data: univData } = trpc.university.list.useQuery(
    { limit: 100 },
    { enabled: isSuperAdmin }
  );

  const { data: report, isLoading } = trpc.report.studentReport.useQuery({
    collegeId: filters.collegeId ? parseInt(filters.collegeId) : undefined,
    courseId: filters.courseId ? parseInt(filters.courseId) : undefined,
    subjectId: filters.subjectId ? parseInt(filters.subjectId) : undefined,
    passingYear: filters.passingYear ? parseInt(filters.passingYear) : undefined,
    category: (filters.category as "regular" | "private" | "ex" | "back") || undefined,
    universityId: filters.universityId ? parseInt(filters.universityId) : undefined,
    page,
    limit: 50,
  });

  const { data: collegesData } = trpc.college.list.useQuery(
    filters.universityId
      ? { universityId: parseInt(filters.universityId), page: 1, limit: 100 }
      : { page: 1, limit: 100 }
  );
  const { data: coursesData } = trpc.course.list.useQuery(
    filters.collegeId
      ? { collegeId: parseInt(filters.collegeId), page: 1, limit: 100 }
      : { page: 1, limit: 100 }
  );
  const { data: subjectsData } = trpc.subject.list.useQuery(
    filters.collegeId
      ? { collegeId: parseInt(filters.collegeId), page: 1, limit: 100 }
      : { page: 1, limit: 100 }
  );

  const exportToCSV = () => {
    if (!report?.items) return;
    const headers = [
      "ID",
      "Roll Number",
      "Enrollment Number",
      "Student Name (English)",
      "Student Name (Hindi)",
      "Father Name (English)",
      "Father Name (Hindi)",
      "Mother Name (English)",
      "Mother Name (Hindi)",
      "Gender",
      "Category",
      "College Name",
      "Course Name",
      "Subject Name",
      "Course Type",
      "Division",
      "Passing Year",
      "Passing Month",
      "Email Address",
      "Mobile Number",
      "Verification Status",
      "Rejection Reason",
      "Final Submitted",
      "Form Locked",
      "Re-edit Allowed",
      "Created At",
      "Updated At",
      "Profile Pic Link",
      "Marksheet Link",
      "Application Letter Link",
      "Signature Link"
    ];
    
    const rows = report.items.map((s) => [
      s.id,
      s.rollNumber || "",
      s.enrollmentNumber || "",
      s.name || "",
      s.nameHi || "",
      s.fatherName || "",
      s.fatherNameHi || "",
      s.motherName || "",
      s.motherNameHi || "",
      s.gender || "",
      s.category || "",
      s.collegeName || "",
      s.courseName || "",
      s.subjectName || "",
      s.courseType || "",
      s.division || "",
      s.passingYear || "",
      s.passingMonth || "",
      s.userEmail || "",
      s.userMobile || "",
      s.verificationStatus || "",
      s.rejectionReason || "",
      s.isFinalSubmitted ? "Yes" : "No",
      s.isLocked ? "Yes" : "No",
      s.canReedit ? "Yes" : "No",
      s.createdAt ? new Date(s.createdAt).toLocaleString() : "",
      s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "",
      `${window.location.origin}/api/view-file?type=photo&studentId=${s.id}`,
      `${window.location.origin}/api/view-file?type=marksheet&studentId=${s.id}`,
      `${window.location.origin}/api/view-file?type=application&studentId=${s.id}`,
      `${window.location.origin}/api/view-file?type=signature&studentId=${s.id}`
    ]);

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_report.csv";
    a.click();
    toast.success("Report exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Student Reports</h1>
        <Button variant="outline" size="sm" onClick={exportToCSV}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
      </div>

      <Card><CardContent className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {isSuperAdmin && (
            <select
              value={filters.universityId}
              onChange={(e) => setFilters({
                ...filters,
                universityId: e.target.value,
                collegeId: "",
                courseId: "",
                subjectId: "",
              })}
              className="border rounded px-2 py-2 text-sm bg-white"
            >
              <option value="">All Universities</option>
              {univData?.items.map((u) => <option key={u.id} value={String(u.id)}>{u.universityName}</option>)}
            </select>
          )}
          <select 
            value={filters.collegeId} 
            onChange={(e) => setFilters({...filters, collegeId: e.target.value, courseId: "", subjectId: ""})}
            className="border rounded px-2 py-2 text-sm bg-white"
          >
            <option value="">All Colleges</option>
            {collegesData?.items.map((c) => <option key={c.id} value={String(c.id)}>{c.collegeName}</option>)}
          </select>
          <select 
            value={filters.courseId} 
            onChange={(e) => setFilters({...filters, courseId: e.target.value, subjectId: ""})}
            className="border rounded px-2 py-2 text-sm bg-white"
          >
            <option value="">All Courses</option>
            {coursesData?.items.map((c) => <option key={c.id} value={String(c.id)}>{c.courseName}</option>)}
          </select>
          <select 
            value={filters.subjectId} 
            onChange={(e) => setFilters({...filters, subjectId: e.target.value})}
            className="border rounded px-2 py-2 text-sm bg-white"
          >
            <option value="">All Subjects</option>
            {subjectsData?.items.map((s) => <option key={s.id} value={String(s.id)}>{s.subjectName}</option>)}
          </select>
          <select 
            value={filters.category} 
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="border rounded px-2 py-2 text-sm bg-white"
          >
            <option value="">All Categories</option>
            <option value="regular">Regular</option>
            <option value="private">Private</option>
            <option value="ex">Ex</option>
            <option value="back">Back</option>
          </select>
          <select 
            value={filters.passingYear} 
            onChange={(e) => setFilters({...filters, passingYear: e.target.value})}
            className="border rounded px-2 py-2 text-sm bg-white"
          >
            <option value="">All Years</option>
            {Array.from({ length: 10 }, (_, i) => 2020 + i).map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
      </CardContent></Card>

      {report?.summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold">{report.total}</p><p className="text-xs text-gray-500">Total Students</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><PieChart className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm font-medium">Categories</p>
                <div className="flex gap-2 mt-1">
                  {report.summary.categoryStats.map((c) => (
                    <span key={c.category} className="text-xs bg-gray-100 px-2 py-1 rounded">{c.category}: {c.count}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><FileBarChart className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm font-medium">Gender</p>
                <div className="flex gap-2 mt-1">
                  {report.summary.genderStats.map((g) => (
                    <span key={g.gender} className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">{g.gender}: {g.count}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent></Card>
        </div>
      )}

      <Card><CardContent className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-500">Roll No</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Gender</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Category</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">College</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Course</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Division</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Year</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8} className="text-center py-8">Loading...</td></tr> :
               report?.items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No data</td></tr> :
               report?.items.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{s.rollNumber}</td>
                  <td className="py-2 px-3">{s.name}</td>
                  <td className="py-2 px-3 capitalize">{s.gender}</td>
                  <td className="py-2 px-3"><span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">{s.category}</span></td>
                  <td className="py-2 px-3 text-gray-500">{s.collegeName}</td>
                  <td className="py-2 px-3 text-gray-500">{s.courseName}</td>
                  <td className="py-2 px-3">{s.division}</td>
                  <td className="py-2 px-3">{s.passingYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report && report.total > report.limit && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Page {report.page} of {Math.ceil(report.total / report.limit)}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(report.total / report.limit)}>Next</Button>
            </div>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
