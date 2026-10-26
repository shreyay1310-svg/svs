/**
 * SMS Service - Integrates with smsfortius.work and bulksmsgateway.in
 * Based on the VB.NET SMSService code provided
 */

const SMS_CONFIG = {
  // Primary gateway: smsfortius.work
  fortius: {
    apiKey: "asOQWA8qyPKDeR1B",
    senderId: "AQPMSU",
    baseUrl: "https://smsfortius.work/V2/apikey.php",
  },
  // Backup gateway: bulksmsgateway.in
  bsg: {
    username: "goutam86",
    password: "Gautam$$82",
    senderId: "AQPMST",
    baseUrl: "http://api.bulksmsgateway.in/sendmessage.php",
  },
};

// Template IDs for smsfortius
const TEMPLATES_FORTIUS = {
  otp: "1207176880896692462",
  link: "1207176880747228728",
  assign: "1207176880394893594",
  reminder: "1207176880120181236",
};

// Template IDs for bulksmsgateway
const TEMPLATES_BSG = {
  otp: "1207176742454203556",
  link: "1207176742603636382",
  assign: "1207176742176162194",
  reminder: "1207176742289107995",
};

async function sendViaFortius(
  mobileNumber: string,
  message: string,
  templateId: string,
): Promise<boolean> {
  try {
    const cfg = SMS_CONFIG.fortius;
    const params = new URLSearchParams({
      apikey: cfg.apiKey,
      senderid: cfg.senderId,
      template_id: templateId,
      number: mobileNumber,
      message: message,
    });
    const url = `${cfg.baseUrl}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const responseText = await response.text();
    console.log(`[SMS Fortius] Response: ${responseText}`);
    return responseText.toLowerCase().includes("success");
  } catch (error) {
    console.error("[SMS Fortius] Error:", error);
    return false;
  }
}

async function sendViaBSG(
  mobileNumber: string,
  message: string,
  templateId: string,
): Promise<boolean> {
  try {
    const cfg = SMS_CONFIG.bsg;
    const params = new URLSearchParams({
      user: cfg.username,
      password: cfg.password,
      mobile: mobileNumber,
      message: message,
      sender: cfg.senderId,
      type: "3",
      template_id: templateId,
    });
    const url = `${cfg.baseUrl}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const responseText = await response.text();
    console.log(`[SMS BSG] Response: ${responseText}`);
    return responseText.toLowerCase().includes("success");
  } catch (error) {
    console.error("[SMS BSG] Error:", error);
    return false;
  }
}

/**
 * Send OTP via SMS
 */
export async function sendOTP(mobileNumber: string, otp: string, name: string): Promise<boolean> {
  const message = `Dear ${name}, One-Time Passcode: ${otp}. Valid 5 minutes. Do not share. - SecuraPrint`;

  // Try primary gateway first, fallback to backup
  const result = await sendViaFortius(mobileNumber, message, TEMPLATES_FORTIUS.otp);
  if (result) return true;

  console.log("[SMS] Primary gateway failed, trying backup...");
  const bsgMessage = `Your Verification OTP is ${otp} @XLICT`;
  const bsgResult = await sendViaBSG(mobileNumber, bsgMessage, TEMPLATES_BSG.otp);
  if (bsgResult) return true;

  // Fallback: Log OTP to console for development
  console.log(`[SMS-Development] Mobile OTP for ${mobileNumber}: ${otp}`);
  return true;
}

/**
 * Send password reset link via SMS
 */
export async function sendPasswordResetLink(mobileNumber: string, token: string, name?: string): Promise<boolean> {
  const displayName = name || "User";
  const message = `Dear ${displayName},\nReset your password using the link below. This link is valid for 10 minutes: https://pdusu-aqpms.autoexampro.com/reset-password?token=${token}\n- SecuraPrint`;

  const result = await sendViaFortius(mobileNumber, message, TEMPLATES_FORTIUS.link);
  if (result) return true;

  const bsgMessage = `https://pdusu-aqpms.autoexampro.com/reset-password?token=${token} valid for 30 minutes only @XLICT`;
  return sendViaBSG(mobileNumber, bsgMessage, TEMPLATES_BSG.link);
}

/**
 * Send task assignment notification
 */
export async function sendAssignmentSMS(mobileNumber: string, _name: string, role: string): Promise<boolean> {
  const message = `Dear ${role}, New task assigned. Login now: https://pdusu-aqpms.autoexampro.com . SecuraPrint`;

  const result = await sendViaFortius(mobileNumber, message, TEMPLATES_FORTIUS.assign);
  if (result) return true;

  const bsgMessage = `New task available, please login for details at https://pdusu-aqpms.autoexampro.com @XLICT`;
  return sendViaBSG(mobileNumber, bsgMessage, TEMPLATES_BSG.assign);
}

/**
 * Send reminder SMS
 */
export async function sendReminderSMS(mobileNumber: string, _name: string): Promise<boolean> {
  const message = `Dear User, assigned task pending. Login now for details: https://pdusu-aqpms.autoexampro.com . SecuraPrint`;

  const result = await sendViaFortius(mobileNumber, message, TEMPLATES_FORTIUS.reminder);
  if (result) return true;

  const bsgMessage = `You assigned task is still pending, please login for details at https://pdusu-aqpms.autoexampro.com @XLICT`;
  return sendViaBSG(mobileNumber, bsgMessage, TEMPLATES_BSG.reminder);
}
