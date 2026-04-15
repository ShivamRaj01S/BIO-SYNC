import nodemailer from "nodemailer";

const BRAND_NAME = "BIO SYNC";
const from = process.env.EMAIL_FROM || `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`;

function getTransporter() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  return transporter;
}

const baseStyles = `
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #374151;
  line-height: 1.6;
  max-width: 560px;
  margin: 0 auto;
`;

const buttonStyle = `
  display: inline-block;
  background: #8B1538;
  color: #fff !important;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  margin-top: 16px;
`;

async function sendMail(options) {
  try {

    const transporter = getTransporter();

    await transporter.sendMail({
      from,
      ...options
    });

  } catch (error) {
    console.error("Email send error:", error.message);
  }
}

export async function sendRegistrationEmail(to, name, role) {

  const html = `
    <div style="${baseStyles}">
      <h2 style="color: #8B1538;">Welcome to ${BRAND_NAME}</h2>
      <p>Hi ${name},</p>
      <p>Your account has been created successfully with the role: <strong>${role}</strong>.</p>
      <p>You can now log in and use the platform to save lives.</p>
      <p style="color:#6B7280;font-size:14px;">— ${BRAND_NAME}</p>
    </div>
  `;

  sendMail({
    to,
    subject: "Registration Successful",
    html
  });

}

export async function sendHospitalVerifiedEmail(to, hospitalName, approved) {

  const subject = approved ? "Hospital Verification Approved" : "Hospital Verification Update";

  const html = `
    <div style="${baseStyles}">
      <h2 style="color:#8B1538;">${subject}</h2>
      <p>Your hospital <strong>${hospitalName}</strong> has been ${approved ? "verified" : "rejected"} by the admin.</p>
      ${approved ? "<p>You can now create emergency requests and confirm donations.</p>" : ""}
    </div>
  `;

   sendMail({ to, subject, html });

}

export async function sendDonorShortlistedEmail(to, donorName, urgency) {

  const appUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const html = `
    <div style="${baseStyles}">
      <h2 style="color:#8B1538;">You have been shortlisted for a donation request</h2>
      <p>Hi ${donorName},</p>
      <p>A ${urgency} urgency request matches your profile.</p>
      <a href="${appUrl}/donor/requests" style="${buttonStyle}">View Request</a>
    </div>
  `;

   sendMail({
    to,
    subject: "Donation request – action needed",
    html
  });

}

export async function sendDonorAcceptedEmail(to, patientName) {

  const html = `
    <div style="${baseStyles}">
      <h2 style="color:#8B1538;">Donor accepted your request</h2>
      <p>Hi ${patientName},</p>
      <p>A donor has accepted your request. Please coordinate with the hospital.</p>
    </div>
  `;

   sendMail({
    to,
    subject: "Donor accepted your request",
    html
  });

}

export async function sendRequestCompletedEmail(to, name, success) {

  const subject = success ? "Donation completed" : "Request status update";

  const html = `
    <div style="${baseStyles}">
      <h2 style="color:#8B1538;">${subject}</h2>
      <p>Hi ${name},</p>
      <p>Your request has been marked as <strong>${success ? "completed" : "failed"}</strong>.</p>
    </div>
  `;

   sendMail({
    to,
    subject,
    html
  });

}
