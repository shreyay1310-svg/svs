/**
 * Email Service - Integrates with Gmail SMTP and Azure Communication Services
 * Based on the VB.NET EmailService code provided
 */

import nodemailer from "nodemailer";

// Gmail SMTP config
const SMTP_CONFIG = {
  host: "smtp.gmail.com",
  port: 587,
  email: "aqpms2020@gmail.com",
  password: "nciyuppqxoatyvjk",
};

// Create Gmail SMTP transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: false,
    auth: {
      user: SMTP_CONFIG.email,
      pass: SMTP_CONFIG.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Send email via Gmail SMTP
 */
export async function sendEmail(
  toAddress: string,
  subject: string,
  htmlBody: string,
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"AQPMS Support" <${SMTP_CONFIG.email}>`,
      to: toAddress.trim(),
      subject: subject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[Email SMTP] Error:", error);
    return false;
  }
}

/**
 * Send OTP via Email
 */
export async function sendEmailOTP(
  toAddress: string,
  otp: string,
  name: string,
): Promise<boolean> {
  const subject = "Your OTP for University ERP Login";
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #2563eb;">University ERP System</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>Your One-Time Passcode (OTP) for login is:</p>
      <div style="background: #f0f9ff; border: 2px solid #2563eb; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${otp}</span>
      </div>
      <p>This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
      <p style="color: #dc2626; font-size: 12px;">If you did not request this OTP, please ignore this email.</p>
      <br><hr style="border:0;border-top:1px solid #ddd;">
      <p style="font-size:12px;color:#666;">
        This is a system generated mail. Please do not reply.<br>
        For any queries, write to <a href="mailto:aqpms2020@gmail.com">aqpms2020@gmail.com</a>
      </p>
    </div>
  `;
  return sendEmail(toAddress, subject, htmlBody);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  toAddress: string,
  otp: string,
  name: string,
): Promise<boolean> {
  const subject = "Password Reset OTP - University ERP";
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #2563eb;">University ERP System</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>You requested a password reset. Your OTP is:</p>
      <div style="background: #f0f9ff; border: 2px solid #2563eb; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${otp}</span>
      </div>
      <p>This OTP is valid for <strong>10 minutes</strong>.</p>
      <p style="color: #dc2626; font-size: 12px;">If you did not request a password reset, please ignore this email.</p>
      <br><hr style="border:0;border-top:1px solid #ddd;">
      <p style="font-size:12px;color:#666;">
        This is a system generated mail. Please do not reply.<br>
        For any queries, write to <a href="mailto:aqpms2020@gmail.com">aqpms2020@gmail.com</a>
      </p>
    </div>
  `;
  return sendEmail(toAddress, subject, htmlBody);
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(
  toAddress: string,
  subject: string,
  message: string,
): Promise<boolean> {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #2563eb;">University ERP System</h2>
      <p>${message}</p>
      <br><hr style="border:0;border-top:1px solid #ddd;">
      <p style="font-size:12px;color:#666;">
        This is a system generated mail. Please do not reply.<br>
        For any queries, write to <a href="mailto:aqpms2020@gmail.com">aqpms2020@gmail.com</a>
      </p>
    </div>
  `;
  return sendEmail(toAddress, subject, htmlBody);
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
