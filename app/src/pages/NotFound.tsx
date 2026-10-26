import { Link } from "react-router";
import { GraduationCap, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-indigo-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-purple-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative text-center max-w-md animate-fade-in">
        {/* Logo */}
        <div className="w-16 h-16 stat-indigo rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>

        {/* 404 */}
        <h1 className="text-8xl font-black text-slate-100 mb-0 leading-none select-none">
          404
        </h1>
        <h2 className="text-2xl font-bold text-slate-800 mb-3 -mt-4">Page Not Found</h2>
        <p className="text-slate-500 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100"
          >
            <Link to="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          UniERP — University Management System
        </p>
      </div>
    </div>
  );
}
