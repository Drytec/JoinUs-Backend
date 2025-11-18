import { Request, Response } from "express";
import { UserService } from "../services/user";
import { AuthService } from "../services/auth";
import { admin, db } from "../database/config";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/passwordReset";

/**
 * Controller class that handles user-related HTTP requests
 * @class UserController
 */
export class UserController {
  /**
   * Retrieves all users from the database
   * @async
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with users array or error message
   */
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await UserService.getAll();
      return res.status(200).json(users);
    } catch (error: any) {
      
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Retrieves a specific user by their ID
   * @async
   * @param {Request} req - Express request object containing user ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with user data or error message
   */
  static async getUserById(req: Request, res: Response) {
    try {
      const user = await UserService.getUserById(req.params.id);
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
      res.status(200).json(user);
    } catch (error) {
      return res.status(500).json({ error: "Error al obtener el usuario" });
    }
  }

  /**
   * Registers a new user with email and password authentication
   * Validates email format, name fields, age, and password strength
   * @async
   * @param {Request} req - Express request object with user registration data in body
   * @param {Request} req.body.email - User's email address
   * @param {Request} req.body.firstName - User's first name
   * @param {Request} req.body.lastName - User's last name
   * @param {Request} req.body.age - User's age (0-120)
   * @param {Request} req.body.password - User's password (min 8 chars, must contain letter and number)
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with success message and user data (without password) or error
   */
  static async registerUser(req: Request, res: Response) {
    try {
      const { email, firstName, lastName, age, password } = req.body;
      const pass = await UserService.getUserByEmail(email);
      if (pass !== null) return res.status(400).json({ error: "Usuario ya existe" });

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof email !== "string" || !emailRegex.test(email)) return res.status(400).json({ error: "Email inválido" });
      if (typeof firstName !== "string" || firstName.trim().length === 0) return res.status(400).json({ error: "Nombre inválido" });
      if (typeof lastName !== "string" || lastName.trim().length === 0) return res.status(400).json({ error: "Apellido inválido" });

      const ageNum = Number(age);
      if (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 120) return res.status(400).json({ error: "Edad inválida" });

      const passwordStr = typeof password === "string" ? password : typeof password === "number" ? String(password) : null;
      if (!passwordStr || passwordStr.length < 8) return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });

      const forbiddenPatterns = [
        /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b)/i,
        /(\bUNION\b|\bOR\b.*=.*\b|\bAND\b.*=.*\b)/i,
        /['"`;\\]/g,
        /^\s+$/
      ];
      const hasForbiddenPattern = forbiddenPatterns.some((pattern) => pattern.test(passwordStr));
      if (hasForbiddenPattern) return res.status(400).json({ error: "La contraseña contiene caracteres o patrones no permitidos" });
      if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(passwordStr)) return res.status(400).json({ error: "La contraseña debe contener al menos una letra y un número" });

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const existing = await UserService.getUserByEmail(email);
      if (existing) return res.status(409).json({ error: "El email ya está registrado" });

      const userRecord = await AuthService.register(email, password);

      const newUserData = {
        uid: userRecord.uid,
        email,
        firstName,
        lastName,
        age,
        password: hashedPassword
      };

      await UserService.createUser(newUserData);
      const { password: _, ...userWithoutPassword } = newUserData;

      return res.status(201).json({ message: "Registro Exitoso", user: userWithoutPassword });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Handles registration with OAuth provider (e.g., Google)
   * Verifies the provider token and checks if user already exists
   * @async
   * @param {Request} req - Express request object
   * @param {Request} req.body.token - Firebase ID token from OAuth provider
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response indicating if user exists with their data or provider data for registration
   */
  static async registerWithProvider(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token no recibido" });
      }

      const decoded = await admin.auth().verifyIdToken(token);

      const uid = decoded.uid;
      const email = decoded.email;
      const name = decoded.name || decoded.displayName;
      const picture = decoded.picture || decoded.photoURL;
      
      const userExists = await UserService.getUserByEmail(email);
      console.log("EMAIL EN GETUSERBYEMAIL:", email);

      if (userExists) {
        return res.status(200).json({ exists: true, user: userExists });
      }

      return res.status(200).json({ exists: false, googleData: { uid, email, name, picture } });

    } catch (err: any) {
      console.log(err)
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Completes the registration process for OAuth provider users
   * Adds additional user information (firstName, lastName, age) to existing OAuth account
   * @async
   * @param {Request} req - Express request object
   * @param {Request} req.body.email - User's email from OAuth provider
   * @param {Request} req.body.firstName - User's first name
   * @param {Request} req.body.lastName - User's last name
   * @param {Request} req.body.age - User's age
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with success message and user data or error
   */
  static async completeRegistration(req: Request, res: Response) {
    try {
      const decoded = req.body;
      const { firstName, lastName, age } = req.body;

      const userExists = await UserService.getUserByEmail(decoded.email);
      if (userExists) return res.status(400).json({ error: "El usuario ya está registrado" });

      const newUser = await UserService.createUser({
        email: decoded.email,
        firstName,
        lastName,
        age,
      });
      return res.status(201).json({ message: "Registro completado", user: newUser });

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Updates an existing user's information
   * @async
   * @param {Request} req - Express request object
   * @param {Request} req.params.id - User ID to update
   * @param {Request} req.body - Updated user data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with success message or error
   */
  static async updateUser(req: Request, res: Response) {
    try {
      await UserService.updateUser(req.params.id, req.body);
      return res.status(200).json({ message: "Usuario actualizado" });
    } catch (error) {
      return res.status(500).json({ error: "Error al actualizar usuario" });
    }
  }

  /**
   * Deletes a user from both the database and Firebase Authentication
   * @async
   * @param {Request} req - Express request object
   * @param {Request} req.params.id - User ID to delete
   * @param {Request} req.body.uid - Firebase Authentication UID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with success message or error
   */
  static async deleteUser(req: Request, res: Response) {
    try {
      await UserService.deleteUser(req.params.id);
      const { uid } = req.body;
      await AuthService.deleteCurrentUser(uid);
      return res.status(200).json({ message: "Usuario eliminado" });
    } catch (error) {
      return res.status(500).json({ error: "Error al eliminar usuario" });
    }
  }

  /**
   * Handles password reset request by sending a reset email
   * Does not reveal whether the email exists in the system (security measure)
   * Generates a secure token and stores it with a 1-hour expiration
   * @async
   * @param {Request} req - Express request object
   * @param {Request} req.body.email - Email address to send password reset instructions
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with generic success message or error
   */
  static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;

    if (typeof email !== "string" || email.trim().length === 0) {
      return res.status(400).json({ error: "Email inválido" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const user = await UserService.getUserByEmailP(normalizedEmail);

      if (!user || !user.id) {
        return res.status(200).json({ message: "Si el correo existe, recibirás instrucciones en breve" });
      }

      const tokensCollection = db.collection("password_reset_tokens");
      const existingTokens = await tokensCollection.where("email", "==", normalizedEmail).get();

      for (const docSnapshot of existingTokens.docs) {
        await docSnapshot.ref.delete();
      }

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const tokenRef = tokensCollection.doc(tokenHash);
      const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);

      await tokenRef.set({
        email: normalizedEmail,
        userId: user.id,
        uid: (user as unknown as { uid?: string }).uid ?? null,
        expiresAt,
        createdAt: admin.firestore.Timestamp.now(),
      });

      const emailResult = await sendPasswordResetEmail(normalizedEmail, token);

      if (!emailResult.success) {
        await tokenRef.delete();
        throw new Error(emailResult.error ?? "No se pudo enviar el correo de recuperación");
      }

      return res.status(200).json({ message: "Si el correo existe, recibirás instrucciones en breve" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message ?? "Error al procesar la solicitud" });
    }
  }

  /**
   * Resets user password using a valid token
   * Validates the token, checks expiration, and updates password in both database and Firebase Auth
   * @async
   * @param {Request} req - Express request object
   * @param {Request} req.body.token - Password reset token from email
   * @param {Request} req.body.password - New password (min 8 chars, must contain letter and number)
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with success message or error
   */
  static async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body;

    if (typeof token !== "string" || token.trim().length === 0) {
      return res.status(400).json({ error: "Token inválido" });
    }

    if (typeof password !== "string" || password.trim().length === 0) {
      return res.status(400).json({ error: "Contraseña inválida" });
    }

    const normalizedToken = token.trim();
    const newPassword = password.trim();

    try {
      const tokensCollection = db.collection("password_reset_tokens");
      const tokenHash = crypto.createHash("sha256").update(normalizedToken).digest("hex");
      const tokenRef = tokensCollection.doc(tokenHash);
      const tokenSnapshot = await tokenRef.get();

      if (!tokenSnapshot.exists) {
        return res.status(400).json({ error: "Token inválido o expirado" });
      }

      const data = tokenSnapshot.data() as
        | {
            email: string;
            userId: string;
            uid?: string | null;
            expiresAt: admin.firestore.Timestamp;
          }
        | undefined;

      if (!data) {
        await tokenRef.delete();
        return res.status(400).json({ error: "Token inválido" });
      }

      if (data.expiresAt.toMillis() < Date.now()) {
        await tokenRef.delete();
        return res.status(400).json({ error: "Token expirado" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
      }

      if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({ error: "La contraseña debe contener al menos una letra y un número" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserService.updateUser(data.userId, { password: hashedPassword });

      try {
        const userUid = data.uid ?? (await admin.auth().getUserByEmail(data.email)).uid;
        await admin.auth().updateUser(userUid, { password: newPassword });
      } catch (authError) {
        console.error("No se pudo actualizar la contraseña en Firebase Auth:", authError);
        throw new Error("No se pudo actualizar la contraseña en Firebase Auth");
      }

      await tokenRef.delete();

      return res.status(200).json({ message: "Contraseña actualizada correctamente" });
    } catch (error: any) {
      const message: string = error?.message ?? "Error al restablecer la contraseña";
      const isClientError =
        message.includes("Token") ||
        message.includes("contraseña") ||
        message.includes("permitidos");

      return res.status(isClientError ? 400 : 500).json({ error: message });
    }
  }
}
