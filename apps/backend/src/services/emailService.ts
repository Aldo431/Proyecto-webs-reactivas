import nodemailer from "nodemailer";
import { getEnv } from "../config/env.ts";

export interface EmailService {
  sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
  sendStudentCodeEmail(to: string, code: string): Promise<void>;
  sendMfaCodeEmail(to: string, code: string): Promise<void>;
}

function createBypassService(): EmailService {
  function logCode(to: string, subject: string, body: string): void {
    console.log("\n========================================");
    console.log("EMAIL BYPASS ( Development / Test )");
    console.log("========================================");
    console.log(`Para: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log(body);
    console.log("========================================\n");
  }

  return {
    async sendPasswordResetEmail(to, resetUrl) {
      logCode(
        to,
        "Restablecer tu contraseña",
        `\nEnlace: ${resetUrl}\n\nEste enlace expira en 15 minutos.\n`,
      );
    },
    async sendStudentCodeEmail(to, code) {
      logCode(
        to,
        "Verifica tu correo U. de Chile",
        `\nTu código de verificación es: ${code}\n\nExpira en 10 minutos.\n`,
      );
    },
    async sendMfaCodeEmail(to, code) {
      logCode(
        to,
        "Tu código de verificación",
        `\nTu código de verificación es: ${code}\n\nNo lo compartas con nadie.\n`,
      );
    },
  };
}

export function createEmailService(): EmailService {
  const env = getEnv();
  if (
    env.nodeEnv === "development" ||
    env.nodeEnv === "test" ||
    !env.smtpHost ||
    !env.smtpPort ||
    !env.smtpUser ||
    !env.smtpPass ||
    !env.smtpFrom
  ) {
    return createBypassService();
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });

  return {
    async sendPasswordResetEmail(to, resetUrl) {
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
    async sendStudentCodeEmail(to, code) {
      await transporter.sendMail({
        from: env.smtpFrom,
        to,
        subject: "Verifica tu correo U. de Chile",
        text: `Tu código de verificación para acceder al descuento de alumnos es: ${code}

Expira en 10 minutos. Si no solicitaste este código, puedes ignorar este correo.`,
      });
    },
    async sendMfaCodeEmail(to, code) {
      await transporter.sendMail({
        from: env.smtpFrom,
        to,
        subject: "Tu código de verificación",
        text: `Tu código de verificación es: ${code}

No lo compartas con nadie. Si no solicitaste este código, cambia tu contraseña.`,
      });
    },
  };
}

export const emailService = createEmailService();
