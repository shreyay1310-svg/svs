export const Session = {
  cookieName: "erp_token",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
  invalidCredentials: "Invalid credentials",
  userInactive: "User account is deactivated",
  notFound: "Resource not found",
  otpInvalid: "Invalid or expired OTP",
} as const;

export const Paths = {
  login: "/login",
} as const;

export const JWT_SECRET = "university-erp-secret-key-2024";
