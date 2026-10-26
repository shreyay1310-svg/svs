import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Activity, Search, Download } from "lucide-react";
import { toast } from "sonner";

const actionColors: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  PASSWORD_RESET: "bg-yellow-100 text-yellow-700",
  PASSWORD_CHANGED: "bg-orange-100 text-orange-700",
  STUDENT_REGISTERED: "bg-blue-100 text-blue-700",
  USER_CREATED: "bg-purple-100 text-purple-700",
  USER_UPDATED: "bg-purple-100 text-purple-700",
  USER_ACTIVATED: "bg-green-100 text-green-700",
  USER_DEACTIVATED: "bg-red-100 text-red-700",
  USER_DELETED: "bg-red-100 text-red-700",
  STUDENT_CREATED: "bg-blue-100 text-blue-700",
  STUDENT_UPDATED: "bg-blue-100 text-blue-700",
  STUDENT_DOCUMENT_UPLOADED: "bg-teal-100 text-teal-700",
  STUDENT_FINAL_SUBMIT: "bg-green-100 text-green-700",
  STUDENT_REEDIT_ALLOWED: "bg-orange-100 text-orange-700",
  STUDENT_DELETED: "bg-red-100 text-red-700",
};

export default function ActivityLogs() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = trpc.activity.list.useQuery({
    action: actionFilter || undefined,
    page,
    limit: 50,
  });

  const filteredItems = data?.items.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.userName?.toLowerCase().includes(s) ||
      item.action?.toLowerCase().includes(s) ||
      item.details?.toLowerCase().includes(s)
    );
  });

  const exportToCSV = () => {
    if (!data?.items) return;
    const headers = ["ID", "User", "Action", "Entity", "Details", "IP Address", "Date"];
    const rows = data.items.map((a) => [
      a.id,
      a.userName,
      a.action,
      `${a.entityType || ""}${a.entityId ? ` #${a.entityId}` : ""}`,
      a.details,
      a.ipAddress,
      a.createdAt ? new Date(a.createdAt).toLocaleString() : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity_logs.csv";
    a.click();
    toast.success("Exported to CSV");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by user, action, or details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select 
              value={actionFilter} 
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-48 border rounded px-2 text-sm bg-white"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="PASSWORD_RESET">Password Reset</option>
              <option value="PASSWORD_CHANGED">Password Changed</option>
              <option value="STUDENT_REGISTERED">Student Registered</option>
              <option value="USER_CREATED">User Created</option>
              <option value="USER_UPDATED">User Updated</option>
              <option value="STUDENT_CREATED">Student Created</option>
              <option value="STUDENT_UPDATED">Student Updated</option>
              <option value="STUDENT_FINAL_SUBMIT">Final Submit</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">User</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Action</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Entity</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Details</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      Loading...
                    </td>
                  </tr>
                ) : filteredItems?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No activity logs found
                    </td>
                  </tr>
                ) : (
                  filteredItems?.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <Activity className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="font-medium text-xs">{log.userName || `User #${log.userId}`}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            actionColors[log.action || ""] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">
                        {log.entityType} {log.entityId ? `#${log.entityId}` : ""}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-xs max-w-xs truncate">
                        {log.details}
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
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
    </div>
  );
}
