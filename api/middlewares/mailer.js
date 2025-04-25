import nodemailer from "nodemailer";
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false, 
    },
  });
  
export async function sendMail({ to, subject,bold, text }) {
    console.log("sending mail to",to)
    const html = `<p><strong>${bold}</strong></p><p>${text}</p>`;

  const mailOptions = {
    from: `"triply" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
}



/*sendMail({
  to: "zahratemmar@gmail.com",
    subject: "Test Email",
    bold : "triply test",
    text: "This is a test email",
  })*/
