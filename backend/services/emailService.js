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
