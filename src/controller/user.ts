import { Request, Response } from "express";
import { UserService } from "../services/user";
import { AuthService } from "../services/auth";
import { admin, db } from "../database/config";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/passwordReset";
import { generateToken } from "../services/jwt";

/**
 * Controller class for handling user-related HTTP requests.
 */
export class UserController {
  /**
   * Retrieves all users.
   * @param {Request} req - The express request object.
   * @param {Response} res - The express response object.
   * @returns {Promise<Response>} The response containing the list of users.
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
   * Retrieves a user by their ID.
   * @param {Request} req - The express request object.
   * @param {Response} res - The express response object.
   * @returns {Promise<Response>} The response containing the user data.
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
   * Registers a new user.
   * @param {Request} req - The express request object containing user details.
   * @param {Response} res - The express response object.
   * @returns {Promise<Response>} The response indicating success or failure.
   */
  static async registerUser(req: Request, res: Response) {
    try {
      console.log("[REGISTER] Request body:", { ...req.body, password: '***' });

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

      console.log("[REGISTER] Hashing password...");
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      console.log("[REGISTER] Checking if email exists...");
      const existing = await UserService.getUserByEmail(email);
      if (existing) return res.status(409).json({ error: "El email ya está registrado" });

      console.log("[REGISTER] Creating user in Firebase Auth...");
      const userRecord = await AuthService.register(email, password);
      console.log("[REGISTER] User created in Firebase Auth:", userRecord.uid);

      const newUserData = {
        uid: userRecord.uid,
        email,
        firstName,
        lastName,
        age,
        password: hashedPassword
      };

      console.log("[REGISTER] Saving user to Firestore...");
      await UserService.createUser(newUserData);
      console.log("[REGISTER] User saved to Firestore");

      const { password: _, ...userWithoutPassword } = newUserData;

      // Generate JWT token
      const token = generateToken({
        uid: userRecord.uid,
        email,
        firstName,
        lastName
      });

      console.log("[REGISTER] Registration successful for:", email);
      return res.status(201).json({
        message: "Registro Exitoso",
        user: { ...userWithoutPassword, hasPassword: true },
        token
      });
    } catch (err: any) {
      console.error("[REGISTER ERROR]", err);
      return res.status(500).json({ error: err.message || "Error al crear la cuenta" });
    }
  }

  /**
   * Checks if a user exists or registers them with a provider token.
   * @param {Request} req - The express request object containing the provider token.
   * @param {Response} res - The express response object.
   * @returns {Promise<Response>} The response with user existence status and data.
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

      // Check by email first, then by uid
      let userExists = await UserService.getUserByEmail(email);

      if (!userExists) {
        userExists = await UserService.getUserByUid(uid);
      }

      console.log("Checking user - Email:", email, "UID:", uid, "Found:", !!userExists);

      if (userExists) {
        // Generate JWT token for existing user
        const jwtToken = generateToken({
          uid: userExists.uid || uid,
          email: userExists.email,
          firstName: userExists.firstName,
          lastName: userExists.lastName
        });

        // Get full user data with password field to check if it exists
        const fullUserData = email ? await UserService.getUserByEmailP(email) : null;
        const hasPassword = !!(fullUserData && fullUserData.password);

        return res.status(200).json({
          exists: true,
          user: { ...userExists, hasPassword },
          token: jwtToken
        });
      }

      return res.status(200).json({ exists: false, googleData: { uid, email, name, picture } });

    } catch (err: any) {
      console.log(err)
      return res.status(500).json({ error: err.message });
    }
  }
  /**
   * Completes the registration for a user signing up with a provider.
   * @param {Request} req - The express request object containing user details.
   * @param {Response} res - The express response object.
   * @returns {Promise<Response>} The response indicating success.
   */
  static async completeRegistration(req: Request, res: Response) {
    try {
      const decoded = req.body;
      const { firstName, lastName, age, uid } = req.body;

      const userExists = await UserService.getUserByEmail(decoded.email);
      if (userExists) return res.status(400).json({ error: "El usuario ya está registrado" });

      await UserService.createUser({
        email: decoded.email,
        firstName,
        lastName,
        age,
        uid
      });

      // Generate JWT token
      const token = generateToken({
        uid: uid,
        email: decoded.email,
        firstName,
        lastName
      });

      return res.status(201).json({
        message: "Registro completado",
        user: {
          uid,
          email: decoded.email,
          firstName,
          lastName,
          age,
          hasPassword: false
        },
        token
      });

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Updates user information.
   * @param {Request} req - The express request object containing update data.
   * @param {Response} res - The express response object.
   * @returns {Promise<Response>} The response indicating success.
   */
  static async updateUser(req: Request, res: Response) {
    try {
      const { uid, password, email, currentPassword, ...updateData } = req.body;

      console.log("Update request received for uid:", uid, "email:", email);
      console.log("Update data (without uid, password, email, currentPassword):", updateData);

      if (!uid && !email) {
        return res.status(400).json({ error: "UID o email es requerido" });
      }

      // Find user by uid first, then by email as fallback (only to get document ID)
      let userDoc = await UserService.getUserByUid(uid);

      if (!userDoc && email) {
        console.log("User not found by uid, trying by email:", email);
        userDoc = await UserService.getUserByEmail(email);
      }

      if (!userDoc || !userDoc.id) {
        console.error("User not found for uid:", uid, "email:", email);
        return res.status(404).json({ error: "Usuario no encontrado. Por favor, completa tu registro primero." });
      }

      console.log("Found user document ID:", userDoc.id);

      // Verify current password only for non-OAuth users
      const bcrypt = require('bcrypt');
      const userWithPassword = await UserService.getUserByEmailP(email);

      if (!userWithPassword || !userWithPassword.password) {
        // OAuth user without password - skip password verification
        console.log("OAuth user detected, skipping password verification");
      } else {
        // User has password, verify it
        if (!currentPassword) {
          return res.status(400).json({ error: "La contraseña actual es requerida" });
        }
        const passwordMatches = await bcrypt.compare(currentPassword, userWithPassword.password);
        if (!passwordMatches) {
          return res.status(401).json({ error: "Contraseña actual incorrecta" });
        }
      }

      // Update the uid in the database if it doesn't match
      if (uid && userDoc.uid !== uid) {
        console.log("Updating uid in database from", userDoc.uid, "to", uid);
        updateData.uid = uid;
      }

      // If password is provided, hash it
      if (password) {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;

        // Also update password in Firebase Auth if user has a uid
        if (uid) {
          try {
            await admin.auth().updateUser(uid, { password });
          } catch (firebaseError) {
            console.error("Error updating Firebase password:", firebaseError);
            // Continue even if Firebase update fails (user might be OAuth only)
          }
        }
      }

      // Update in Firestore
      await UserService.updateUser(userDoc.id, updateData);
      console.log("User updated successfully in Firestore");

      // Return the updated data to frontend
      return res.status(200).json({
        message: "Usuario actualizado",
        user: {
          uid,
          email,
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          age: updateData.age
        }
      });
    } catch (error: any) {
      console.error("Error in updateUser:", error);
      return res.status(500).json({ error: error.message || "Error al actualizar usuario" });
    }
  }

  /**
   * Changes the user's password.
   * @param {Request} req - The express request object containing password details.
   * @param {Response} res - The express response object.
   * @returns {Promise<Response>} The response indicating success.
   */
  static async changePassword(req: Request, res: Response) {
    try {
      const { uid, email, currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!uid || !email || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres" });
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({ error: "La contraseña debe contener mayúsculas, minúsculas y números" });
      }

      // Get user document directly from Firestore
      const userSnapshot = await db.collection("users").where("uid", "==", uid).get();

      if (userSnapshot.empty) {
        // Try to find by email
        const usersByEmail = await db.collection("users").where("email", "==", email).get();
        if (usersByEmail.empty) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const userData = usersByEmail.docs[0].data();

        // Check if user has a password
        if (!userData.password) {
          return res.status(400).json({
            error: "Las cuentas de OAuth (Google/GitHub) no tienen contraseña para cambiar"
          });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, userData.password);
        if (!isPasswordValid) {
          return res.status(401).json({ error: "Contraseña actual incorrecta" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in Firestore
        await usersByEmail.docs[0].ref.update({
          password: hashedPassword,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update password in Firebase Auth
        try {
          await admin.auth().updateUser(uid, {
            password: newPassword
          });
        } catch (authError: any) {
          console.error("Error updating Firebase Auth password:", authError);
        }

        return res.status(200).json({
          message: "Contraseña cambiada exitosamente"
        });
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();

      // Check if user has a password (not OAuth-only account)
      if (!userData.password) {
        return res.status(400).json({
          error: "Las cuentas de OAuth (Google/GitHub) no tienen contraseña para cambiar"
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, userData.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Contraseña actual incorrecta" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password in Firestore
      await userDoc.ref.update({
        password: hashedPassword,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update password in Firebase Auth
      try {
        await admin.auth().updateUser(uid, {
          password: newPassword
        });
      } catch (authError: any) {
        console.error("Error updating Firebase Auth password:", authError);
        // Continue even if Firebase Auth update fails (user might be OAuth-only)
      }

      return res.status(200).json({
        message: "Contraseña cambiada exitosamente"
      });
    } catch (error: any) {
      console.error("Error in changePassword:", error);
      return res.status(500).json({ error: error.message || "Error al cambiar la contraseña" });
    }
  }

  /**
   * Deletes a user account.
   * @param {Request} req - The express request object containing the user ID.
   * @param {Response} res - The express response object.
   * @returns {Promise<Response>} The response indicating success.
   */
  static async deleteUser(req: Request, res: Response) {
    try {
      const uid = req.params.id; // This is the uid from URL
      const { email, currentPassword } = req.body;

      console.log("Delete request received for uid:", uid);

      if (!uid) {
        return res.status(400).json({ error: "UID es requerido" });
      }

      // Find user by uid
      const user = await UserService.getUserByUid(uid);

      console.log("User found for deletion:", user);

      if (!user || !user.id) {
        console.error("User not found for uid:", uid);
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Verify password before deletion - only for non-OAuth users
      const bcrypt = require('bcrypt');
      const userWithPassword = await UserService.getUserByEmailP(email || user.email);

      if (!userWithPassword || !userWithPassword.password) {
        // OAuth user without password - skip password verification
        console.log("OAuth user detected for deletion, skipping password verification");
      } else {
        // User has password, verify it
        if (!currentPassword) {
          return res.status(400).json({ error: "La contraseña es requerida para eliminar la cuenta" });
        }
        const passwordMatches = await bcrypt.compare(currentPassword, userWithPassword.password);
        if (!passwordMatches) {
          return res.status(401).json({ error: "Contraseña incorrecta" });
        }
        console.log("Password verified successfully for deletion");
      }

      // Delete from Firestore
      await UserService.deleteUser(user.id);

      // Delete from Firebase Auth
      try {
        await admin.auth().deleteUser(uid);
        console.log("User deleted from Firebase Auth");
      } catch (firebaseError) {
        console.error("Error deleting from Firebase Auth:", firebaseError);
        // Continue even if Firebase delete fails
      }

      return res.status(200).json({ message: "Usuario eliminado" });
    } catch (error: any) {
      console.error("Error in deleteUser:", error);
      return res.status(500).json({ error: error.message || "Error al eliminar usuario" });
    }
  }

  /**
   * Maneja la solicitud de restablecimiento sin revelar si el correo existe.
   * @param {Request} req - The express request object containing the email.
   * @param {Response} res - The express response object.
   * @returns {Promise<Response>} The response indicating the request was processed.
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
   * Permite definir una nueva contraseña a partir de un token válido.
   * @param {Request} req - The express request object containing token and new password.
   * @param {Response} res - The express response object.
   * @returns {Promise<Response>} The response indicating success.
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

      // Try to update Firebase Auth password, but don't fail if it doesn't work (OAuth users)
      try {
        const userUid = data.uid ?? (await admin.auth().getUserByEmail(data.email)).uid;
        await admin.auth().updateUser(userUid, { password: newPassword });
        console.log("Password updated in Firebase Auth successfully");
      } catch (authError) {
        console.warn("Could not update Firebase Auth password (user might be OAuth-only):", authError);
        // Continue - password is already updated in Firestore
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
