import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginRole, setLoginRole] = useState<"admin" | "staff" | "student">("admin");

  // Mode states: "login" | "register" | "forgot"
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");

  // Login credentials
  const [loginId, setLoginId] = useState(""); // User ID for Admin/Staff, or Roll/Email/Mobile for Student
  const [password, setPassword] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [obscuredContact, setObscuredContact] = useState<string | null>(null);
  const [loginOtp, setLoginOtp] = useState("");

  // Student Registration wizard state
  const [regStep, setRegStep] = useState<"verify" | "contact" | "otp" | "password">("verify");
  const [regRollNumber, setRegRollNumber] = useState("");
  const [regEnrollment, setRegEnrollment] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");


  // Student Forgot Password wizard state
  const [forgotStep, setForgotStep] = useState<"verify" | "otp" | "reset">("verify");
  const [forgotRoll, setForgotRoll] = useState("");
  const [forgotEnrollment, setForgotEnrollment] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMobile, setForgotMobile] = useState("");
  const [forgotEmailOtp, setForgotEmailOtp] = useState("");
  const [forgotMobileOtp, setForgotMobileOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotNewPasswordConfirm, setForgotNewPasswordConfirm] = useState("");


  // ─── Mutations ───
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.otpRequired) {
        setOtpRequired(true);
        setObscuredContact(data.mobileMask || data.emailMask || "your registered contact");
        toast.success("OTP sent to your registered contact!");
      } else {
        localStorage.setItem("erp_token", data.token);
        toast.success("Login successful!");
        setTimeout(() => {
          navigate("/dashboard");
        }, 100);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyLoginOtpMutation = trpc.auth.verifyLoginOtp.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("erp_token", data.token);
      toast.success("Login successful!");
      setTimeout(() => {
        navigate("/dashboard");
      }, 100);
    },
    onError: (err) => toast.error(err.message),
  });

  const setupStudentPasswordDirectMutation = trpc.auth.setupStudentPasswordDirect.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Login credentials configured successfully! Please sign in.");
      resetRegState();
      setMode("login");
      setLoginRole("student");
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyStudentRecordMutation = trpc.auth.verifyStudentRecord.useMutation();

  const forgotSendOtpMutation = trpc.auth.studentForgotPasswordSendOtp.useMutation({
    onSuccess: () => {
      setForgotStep("otp");
      toast.success("Password reset OTPs sent to your Email/Mobile!");
    },
    onError: (err) => toast.error(err.message),
  });

  const forgotResetMutation = trpc.auth.studentForgotPasswordReset.useMutation({
    onSuccess: () => {
      toast.success("Password reset successful! Please login.");
      resetForgotState();
      setMode("login");
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Reset State Functions ───
  const resetRegState = () => {
    setRegStep("verify");
    setRegRollNumber("");
    setRegEnrollment("");
    setRegName("");
    setRegEmail("");
    setRegMobile("");
    setRegPassword("");
    setRegPasswordConfirm("");
  };

  const resetForgotState = () => {
    setForgotStep("verify");
    setForgotRoll("");
    setForgotEnrollment("");
    setForgotEmail("");
    setForgotMobile("");
    setForgotEmailOtp("");
    setForgotMobileOtp("");
    setForgotNewPassword("");
    setForgotNewPasswordConfirm("");
  };

  // ─── Event Handlers ───
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpRequired) {
      if (!loginId || !password) {
        toast.error("Please enter both ID and password");
        return;
      }
      loginMutation.mutate({ userId: loginId.trim(), password, role: loginRole });
    } else {
      if (!loginOtp) {
        toast.error("Please enter the OTP");
        return;
      }
      verifyLoginOtpMutation.mutate({
        userId: loginId.trim(),
        role: loginRole,
        otp: loginOtp,
      });
    }
  };

  // Registration: Step 1 Verify Record
  const handleRegVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regRollNumber || !regEnrollment) {
      toast.error("Enter Roll and Enrollment Numbers");
      return;
    }
    try {
      const data = await verifyStudentRecordMutation.mutateAsync({
        rollNumber: regRollNumber.trim(),
        enrollmentNumber: regEnrollment.trim(),
      });
      setRegName(data.studentName);
      setRegEmail(data.email || "");
      setRegMobile(data.mobile || "");
      setRegStep("contact");
      toast.success("Student record matched!");
    } catch (err: any) {
      toast.error(err.message || "Record not found");
    }
  };

  // Registration: Step 2 Complete Setup (Direct)
  const handleRegSubmitDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regMobile) {
      toast.error("Please enter email and mobile number");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    setupStudentPasswordDirectMutation.mutate({
      rollNumber: regRollNumber.trim(),
      enrollmentNumber: regEnrollment.trim(),
      email: regEmail.trim().toLowerCase(),
      mobile: regMobile.trim(),
      password: regPassword,
    });
  };

  // Forgot Password: Step 1 Verify & Send OTPs
  const handleForgotVerifyAndSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotRoll || !forgotEnrollment || (!forgotEmail && !forgotMobile)) {
      toast.error("Please fill required verification fields");
      return;
    }
    forgotSendOtpMutation.mutate({
      rollNumber: forgotRoll.trim(),
      enrollmentNumber: forgotEnrollment.trim(),
      email: forgotEmail ? forgotEmail.trim().toLowerCase() : undefined,
      mobile: forgotMobile ? forgotMobile.trim() : undefined,
    });
  };

  // Forgot Password: Step 2 Verify & Reset Password
  const handleForgotReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotEmail && !forgotEmailOtp) {
      toast.error("Please enter email OTP");
      return;
    }
    if (forgotMobile && !forgotMobileOtp) {
      toast.error("Please enter mobile OTP");
      return;
    }
    if (forgotNewPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (forgotNewPassword !== forgotNewPasswordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    forgotResetMutation.mutate({
      rollNumber: forgotRoll.trim(),
      enrollmentNumber: forgotEnrollment.trim(),
      email: forgotEmail ? forgotEmail.trim().toLowerCase() : undefined,
      mobile: forgotMobile ? forgotMobile.trim() : undefined,
      emailOtp: forgotEmailOtp ? forgotEmailOtp.trim() : undefined,
      mobileOtp: forgotMobileOtp ? forgotMobileOtp.trim() : undefined,
      newPassword: forgotNewPassword,
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* ─── Left Hero Panel ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-indigo-400/20 rounded-full" />

        {/* Logo Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-xl leading-tight">Student Data Verification</p>
              <p className="text-indigo-200 text-xs">Academic & Profile Verification Portal</p>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Academic Verification<br />
            <span className="text-indigo-200">Simplified & Secured</span>
          </h1>
          <p className="text-indigo-200 text-base mb-8 leading-relaxed max-w-md">
            A unified verification system enabling student credentials validation, profile data lock, and dual OTP-secured document submission.
          </p>
          <div className="space-y-3">
            {[
              "Dual OTP (Email + Mobile) Verification",
              "Academic Details Locked by Admin/Staff",
              "Student Profile Verification & Sealing",
              "Audit Trial and Detailed Log Tracking",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-white">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-indigo-100">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-indigo-300 text-xs">
          © 2026 Student Data Verification. All rights reserved.
        </p>
      </div>

      {/* ─── Right Form Panel ─── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md animate-scale-in">
          {/* Mobile Logo Branding */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 stat-indigo rounded-xl flex items-center justify-center shadow-md shadow-indigo-100">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 leading-tight">Student Data Verification</p>
              <p className="text-[10px] text-slate-400">Portal Access</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 p-6 sm:p-8">
            {/* ─── VIEW 1: Login Mode ─── */}
            {mode === "login" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Sign In</h2>
                  <p className="text-slate-500 text-sm mt-1">Select your access role and enter credentials</p>
                </div>

                {/* Role Tabs */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {(["admin", "staff", "student"] as const).map((role) => {
                    const colors = {
                      admin: { active: "bg-violet-600 text-white shadow-violet-100", hover: "hover:bg-violet-50 hover:text-violet-700" },
                      staff: { active: "bg-sky-600 text-white shadow-sky-100", hover: "hover:bg-sky-50 hover:text-sky-700" },
                      student: { active: "bg-emerald-600 text-white shadow-emerald-100", hover: "hover:bg-emerald-50 hover:text-emerald-700" },
                    };
                    const isActive = loginRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setLoginRole(role);
                          setLoginId("");
                          setPassword("");
                          setOtpRequired(false);
                          setLoginOtp("");
                        }}
                        className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all capitalize border ${
                          isActive
                            ? `${colors[role].active} border-transparent shadow-md`
                            : `border-slate-200 text-slate-500 ${colors[role].hover}`
                        }`}
                      >
                        {role === "admin" ? "🛡️ " : role === "staff" ? "👤 " : "🎓 "}{role}
                      </button>
                    );
                  })}
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  {otpRequired ? (
                    <div className="space-y-4 animate-slide-in">
                      <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-indigo-800 text-xs leading-relaxed">
                        <Lock className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <span>OTP has been sent to your registered contact: <strong className="font-semibold">{obscuredContact}</strong></span>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-600 text-center block mb-1">Enter 6-Digit OTP *</Label>
                        <Input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="000000"
                          value={loginOtp}
                          onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="mt-1.5 rounded-xl font-mono text-center tracking-[0.4em] text-lg font-bold h-11"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setOtpRequired(false);
                            setLoginOtp("");
                          }}
                          className="flex-1 rounded-xl h-11 border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          className={`flex-1 h-11 rounded-xl font-bold shadow-lg text-white ${
                            loginRole === "admin"
                              ? "bg-violet-600 hover:bg-violet-700"
                              : loginRole === "staff"
                              ? "bg-sky-600 hover:bg-sky-700"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          }`}
                          disabled={verifyLoginOtpMutation.isPending}
                        >
                          {verifyLoginOtpMutation.isPending ? "Verifying..." : "Verify OTP"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs font-semibold text-slate-600">
                          {loginRole === "student" ? "Login ID (Roll No / Email / Mobile)" : "User ID"}
                        </Label>
                        <Input
                          value={loginId}
                          onChange={(e) => setLoginId(e.target.value)}
                          placeholder={loginRole === "student" ? "Enter Roll Number, Email or Mobile" : "Enter your user ID"}
                          required
                          className="mt-1.5 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 h-11"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-semibold text-slate-600">Password</Label>
                          {loginRole === "student" && (
                            <button
                              type="button"
                              onClick={() => {
                                resetForgotState();
                                setMode("forgot");
                              }}
                              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="relative mt-1.5">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            className="rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 h-11 pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className={`w-full h-11 rounded-xl font-bold shadow-lg text-sm mt-2 text-white ${
                          loginRole === "admin"
                            ? "bg-violet-600 hover:bg-violet-700 shadow-violet-100"
                            : loginRole === "staff"
                            ? "bg-sky-600 hover:bg-sky-700 shadow-sky-100"
                            : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                        }`}
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Verifying..." : `Sign In as ${loginRole}`}
                      </Button>
                    </>
                  )}
                </form>

                {/* Student Registration Entry */}
                {loginRole === "student" && (
                  <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400 mb-2">New to the portal?</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetRegState();
                        setMode("register");
                      }}
                      className="w-full border-slate-200 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                    >
                      🎓 Register & Verify Student Record
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ─── VIEW 2: Student Registration Wizard ─── */}
            {mode === "register" && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Student Registration</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Setup your portal access credentials</p>
                  </div>
                </div>

                {/* Step 1: Verification */}
                {regStep === "verify" && (
                  <form onSubmit={handleRegVerify} className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2">
                      <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <p>Provide your roll number and enrollment number exactly as stored in the university database records.</p>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Roll Number *</Label>
                      <Input
                        value={regRollNumber}
                        onChange={(e) => setRegRollNumber(e.target.value)}
                        placeholder="Enter roll number"
                        required
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Enrollment Number *</Label>
                      <Input
                        value={regEnrollment}
                        onChange={(e) => setRegEnrollment(e.target.value)}
                        placeholder="Enter enrollment number"
                        required
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-50"
                      disabled={verifyStudentRecordMutation.isPending}
                    >
                      {verifyStudentRecordMutation.isPending ? "Verifying..." : "Verify Record"}
                    </Button>
                  </form>
                )}

                {/* Step 2: Configure Credentials (Direct) */}
                {regStep === "contact" && (
                  <form onSubmit={handleRegSubmitDirect} className="space-y-4 animate-slide-in">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800">
                      <div className="font-semibold text-sm">Matched: {regName}</div>
                      <p className="text-[10px] text-emerald-600 mt-1">Set up or update your active email address, mobile number, and portal password below.</p>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Email Address *</Label>
                      <Input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="example@email.com"
                        required
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Mobile Number *</Label>
                      <Input
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value)}
                        placeholder="Enter mobile number"
                        required
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Password *</Label>
                      <Input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        required
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Confirm Password *</Label>
                      <Input
                        type="password"
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        placeholder="Confirm password"
                        required
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg"
                      disabled={setupStudentPasswordDirectMutation.isPending}
                    >
                      {setupStudentPasswordDirectMutation.isPending ? "Configuring Access..." : "Register & Set Password"}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* ─── VIEW 3: Student Forgot Password ─── */}
            {mode === "forgot" && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Forgot Password</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Recover student account access</p>
                  </div>
                </div>

                {/* Step 1: Verification Form */}
                {forgotStep === "verify" && (
                  <form onSubmit={handleForgotVerifyAndSend} className="space-y-4">
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-xs text-violet-800">
                      Verify your identity using Roll/Enrollment. Enter your registered email or mobile to receive reset OTP.
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Roll Number *</Label>
                      <Input
                        value={forgotRoll}
                        onChange={(e) => setForgotRoll(e.target.value)}
                        placeholder="Enter roll number"
                        required
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Enrollment Number *</Label>
                      <Input
                        value={forgotEnrollment}
                        onChange={(e) => setForgotEnrollment(e.target.value)}
                        placeholder="Enter enrollment number"
                        required
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Registered Email Address</Label>
                      <Input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <div className="text-center text-xs text-slate-400 my-1">OR</div>
                      <Label className="text-xs font-semibold text-slate-600">Registered Mobile Number</Label>
                      <Input
                        value={forgotMobile}
                        onChange={(e) => setForgotMobile(e.target.value)}
                        placeholder="Enter mobile number"
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg"
                      disabled={forgotSendOtpMutation.isPending}
                    >
                      {forgotSendOtpMutation.isPending ? "Sending OTP..." : "Send Verification OTPs"}
                    </Button>
                  </form>
                )}

                {/* Step 2: OTP and Password Reset Form */}
                {forgotStep === "otp" && (
                  <form onSubmit={handleForgotReset} className="space-y-4 animate-slide-in">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                      Enter the 6-digit OTP codes and create your new password.
                    </div>

                    {forgotEmail && (
                      <div>
                        <Label className="text-xs font-semibold text-slate-600">📧 Email OTP *</Label>
                        <Input
                          value={forgotEmailOtp}
                          onChange={(e) => setForgotEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          className="mt-1.5 rounded-xl font-mono text-center tracking-[0.4em] h-11 text-lg"
                          required
                        />
                      </div>
                    )}

                    {forgotMobile && (
                      <div>
                        <Label className="text-xs font-semibold text-slate-600">📱 Mobile OTP *</Label>
                        <Input
                          value={forgotMobileOtp}
                          onChange={(e) => setForgotMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          className="mt-1.5 rounded-xl font-mono text-center tracking-[0.4em] h-11 text-lg"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs font-semibold text-slate-600">New Password *</Label>
                      <Input
                        type="password"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        required
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600">Confirm New Password *</Label>
                      <Input
                        type="password"
                        value={forgotNewPasswordConfirm}
                        onChange={(e) => setForgotNewPasswordConfirm(e.target.value)}
                        placeholder="Confirm password"
                        required
                        className="mt-1.5 rounded-xl h-11"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg"
                      disabled={forgotResetMutation.isPending}
                    >
                      {forgotResetMutation.isPending ? "Resetting Password..." : "Reset Password"}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
