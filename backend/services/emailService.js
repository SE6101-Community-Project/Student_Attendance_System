import transporter from "../config/nodemailer.js"; // adjust path if needed

// Send verification email
export const sendVerificationEmail = async (email, name, token) => {
  const verificationUrl = `${process.env.CLIENT_URL}/api/student/verify-email?token=${token}`;

  const mailOptions = {
    from: `"SUSL - Attendance System" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Email Verification - Attendance System",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Email Verification</h2>
        <p>Dear ${name},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" 
           style="background-color: #3498db; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <hr/>
        <p style="color: #7f8c8d; font-size: 12px;">
          Sabaragamuwa University of Sri Lanka - Attendance System
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send verification email for lecturers (with different URL and message)
export const sendVerificationEmailLec = async (email, name, token) => {
  const verificationUrl = `${process.env.CLIENT_URL}/api/lecturer/verify-email?token=${token}`;

  const mailOptions = {
    from: `"SUSL - Attendance System" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Email Verification - Attendance System",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Email Verification</h2>
        <p>Dear ${name},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" 
           style="background-color: #3498db; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <hr/>
        <p style="color: #7f8c8d; font-size: 12px;">
          Sabaragamuwa University of Sri Lanka - Attendance System
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send password reset email
export const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/api/lecturer/reset-password?token=${token}`;

  const mailOptions = {
    from: `"SUSL - Attendance System" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Password Reset - Attendance System",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Password Reset Request</h2>
        <p>Dear ${name},</p>
        <p>You requested to reset your password. Click the button below:</p>
        <a href="${resetUrl}" 
           style="background-color: #e74c3c; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          Reset Password
        </a>
        <p>This link expires in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr/>
        <p style="color: #7f8c8d; font-size: 12px;">
          Sabaragamuwa University of Sri Lanka - Attendance System
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send low attendance warning
export const sendLowAttendanceWarning = async (
  email,
  name,
  courseCode,
  percentage
) => {
  const mailOptions = {
    from: `"SUSL - Attendance System" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: `Low Attendance Warning - ${courseCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f39c12;">Low Attendance Warning</h2>
        <p>Dear ${name},</p>
        <p>Your attendance for <strong>${courseCode}</strong> has fallen below the required threshold.</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p><strong>Current Attendance:</strong> ${percentage}%</p>
          <p><strong>Required Minimum:</strong> 80%</p>
        </div>
        <p>Please attend upcoming lectures to improve your attendance.</p>
        <hr/>
        <p style="color: #7f8c8d; font-size: 12px;">
          Sabaragamuwa University of Sri Lanka - Attendance System
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};