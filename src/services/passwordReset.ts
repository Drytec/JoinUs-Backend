import sgMail from "@sendgrid/mail";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../database/config";
import { UserService } from "./user";

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface PasswordResetRecord {
  userDocId: string;
  email: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

const RESET_COLLECTION = "password_reset_tokens";
const DEFAULT_EXPIRATION_MINUTES = 60;

let sendGridConfigured = false;

/**
 * Encapsula la lógica para crear y validar flujos de restablecimiento de contraseña.
 */
export class PasswordResetService {
  /**
   * Genera un token, lo persiste y envía el correo de recuperación.
   * El método no revela si el usuario existe para evitar enumeraciones.
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserService.getUserByEmailP(normalizedEmail);

    if (!user || !user.id) {
      return;
    }

    await this.revokeExistingTokens(normalizedEmail);

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const tokenRef = doc(db, RESET_COLLECTION, tokenHash);
    const expiresAt = Timestamp.fromMillis(Date.now() + this.tokenTtlMs());

    await setDoc(tokenRef, {
      userDocId: user.id,
      email: normalizedEmail,
      expiresAt,
      createdAt: Timestamp.now(),
    });

    const emailResult = await this.sendPasswordResetEmail(normalizedEmail, token);

    if (!emailResult.success) {
      await deleteDoc(tokenRef);
      throw new Error(emailResult.error ?? "No se pudo enviar el correo de recuperación");
    }
  }

  /**
   * Valida el token, actualiza la contraseña y elimina los registros temporales.
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const tokenSnapshot = await getDoc(doc(db, RESET_COLLECTION, tokenHash));

    if (!tokenSnapshot.exists()) {
      throw new Error("Token inválido o expirado");
    }

    const data = tokenSnapshot.data() as PasswordResetRecord;

    if (data.expiresAt.toMillis() < Date.now()) {
      await deleteDoc(tokenSnapshot.ref);
      throw new Error("Token expirado");
    }

    this.validatePassword(newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserService.updateUser(data.userDocId, { password: hashedPassword });

    await deleteDoc(tokenSnapshot.ref);
  }

  private static async revokeExistingTokens(email: string): Promise<void> {
    const tokenCollection = collection(db, RESET_COLLECTION);
    const tokenQuery = query(tokenCollection, where("email", "==", email));
    const snapshot = await getDocs(tokenQuery);

    const deletions = snapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref));
    await Promise.all(deletions);
  }

  private static validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }

    const forbiddenPatterns = [
      /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b)/i,
      /(\bUNION\b|\bOR\b.*=.*\b|\bAND\b.*=.*\b)/i,
      /['"`;\\]/g,
      /^\s+$/,
    ];

    if (forbiddenPatterns.some((pattern) => pattern.test(password))) {
      throw new Error("La contraseña contiene caracteres o patrones no permitidos");
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      throw new Error("La contraseña debe contener al menos una letra y un número");
    }
  }

  private static generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private static tokenTtlMs(): number {
    const configuredMinutes = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES);
    const minutes = Number.isFinite(configuredMinutes) && configuredMinutes > 0
      ? configuredMinutes
      : DEFAULT_EXPIRATION_MINUTES;
    return minutes * 60 * 1000;
  }

  private static ensureSendGrid(): void {
    if (sendGridConfigured) {
      return;
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("Configura SENDGRID_API_KEY para poder enviar correos");
    }

    sgMail.setApiKey(apiKey);
    sendGridConfigured = true;
  }

  private static buildResetUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL;

    if (!baseUrl) {
      throw new Error("Configura FRONTEND_URL para generar el enlace de restablecimiento");
    }

    const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${normalizedBase}/reset-password/${token}`;
  }

  private static buildEmailTemplate(resetUrl: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Restablecimiento de contraseña - JoinUs</title>
</head>
<body style="margin:0; padding:0; background-color:#000000; font-family: Arial, Helvetica, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; background:#0a0a0a; border-radius:8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.6);">
          <tr>
            <td align="center" style="background: linear-gradient(90deg,#05120b,#00150d); padding:28px;">
              <h1 style="margin:0; font-size:24px; color:#e6fff6;">JoinUs</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 12px 28px; text-align:center;">
              <h2 style="margin:0; font-size:26px; line-height:1.1; color:#e6fff6; font-weight:700;">
                Restablece tu contraseña
              </h2>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 20px 28px; text-align:center;">
              <p style="margin:0; color:#bfeee0; font-size:15px; line-height:1.6;">
                Hemos recibido una solicitud para cambiar la contraseña de tu cuenta de <strong>JoinUs</strong>.
                Haz clic en el botón de abajo para crear una nueva contraseña. Este enlace expira en <strong>1 hora</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 28px 26px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px; background:linear-gradient(180deg,#00d084,#00b86a);">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block; padding:14px 30px; font-size:16px; color:#00140a; font-weight:700; text-decoration:none; border-radius:8px;">
                      Cambiar mi contraseña
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 18px 28px;">
              <p style="margin:0; color:#96e8c9; font-size:13px; line-height:1.5;">
                Si no puedes pulsar el botón, copia y pega este enlace en tu navegador:
              </p>
              <p style="word-break:break-all; margin:8px 0 0 0; color:#8af2c6; font-size:13px;">
                <a href="${resetUrl}" target="_blank" style="color:#8af2c6; text-decoration:underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;">
              <div style="background:#07120f; border:1px solid rgba(0,208,132,0.12); border-radius:8px; padding:14px;">
                <p style="margin:0 0 8px 0; color:#00d084; font-weight:700; font-size:14px;">
                  ⚠️ Importante
                </p>
                <ul style="margin:0; padding-left:18px; color:#b9f7dd; font-size:13px; line-height:1.5;">
                  <li>El enlace expira en <strong>1 hora</strong>.</li>
                  <li>Si no solicitaste este cambio, puedes ignorar este correo.</li>
                  <li>Tu contraseña actual se mantendrá segura hasta que la cambies.</li>
                </ul>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 36px 28px; text-align:center; background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.03));">
              <p style="margin:0 0 6px 0; color:#b9f7dd; font-size:14px;">
                Saludos cordiales,
              </p>
              <p style="margin:0 0 12px 0; color:#e6fff6; font-weight:700; font-size:15px;">
                El equipo de JoinUs
              </p>
              <p style="margin:0; color:#6a6f6b; font-size:12px;">
                Este es un correo automático — por favor no respondas a esta dirección.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private static async sendPasswordResetEmail(email: string, token: string): Promise<EmailResponse> {
    try {
      this.ensureSendGrid();

      const fromEmail = process.env.EMAIL_SENDER;
      if (!fromEmail) {
        throw new Error("Configura EMAIL_SENDER para poder enviar correos");
      }

      const senderName = process.env.EMAIL_SENDER_NAME ?? "JoinUs Soporte";
      const resetUrl = this.buildResetUrl(token);
      const html = this.buildEmailTemplate(resetUrl);

      const message = {
        to: email,
        from: {
          email: fromEmail,
          name: senderName,
        },
        subject: "Restablece tu contraseña de JoinUs",
        html,
      };

      const [response] = await sgMail.send(message);
      return { success: true, messageId: response.headers["x-message-id"] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("Email sending failed:", error);
      return { success: false, error: message };
    }
  }

}
