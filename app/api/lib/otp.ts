import { sendEmailOTP as sendEmailOtp } from "./email";
import { sendOTP as sendSmsOtp } from "./sms";

export async function sendEmailOTP(email: string, otp: string): Promise<void> {
  await sendEmailOtp(email, otp, "Student");
  console.log(`OTP sent to email ${email}: ${otp}`);
}

export async function sendSMSOTP(mobile: string, otp: string): Promise<void> {
  await sendSmsOtp(mobile, otp, "Student");
  console.log(`OTP sent to mobile ${mobile}: ${otp}`);
}