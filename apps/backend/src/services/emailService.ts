import nodemailer from "nodemailer";
import { getEnv } from "../config/env.ts";

export interface EmailService {
  sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
}

export function createEmailService(): EmailService {
  const env = getEnv();

  // In development/test without SMTP config, bypass email sending
  if (!env.smtpHost || !env.smtpPort || !env.smtpUser || !env.smtpPass || !env.smtpFrom) {
    return {
      async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
        console.log("\n========================================");
        console.log("📧 EMAIL BYPASS (Development Mode)");
        console.log("========================================");
        console.log(`To: ${to}`);
        console.log(`Subject: Restablecer tu contraseña`);
        console.log(`\nReset URL: ${resetUrl}`);
        console.log("========================================\n");
      },
    };
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return {
    async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
      await transporter.sendMail({
        from: env.smtpFrom,
        to,
        subject: "Restablecer tu contraseña",
        text: `Haz clic en el enlace para restablecer tu contraseña:

${resetUrl}

Este enlace expira en 15 minutos.

Si no solicitaste este cambio, puedes ignorar este correo.`,
      });
    },
  };
}

export const emailService = createEmailService();
