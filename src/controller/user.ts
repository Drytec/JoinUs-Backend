import { Request, Response } from "express";
import { UserService } from "../services/user";
import { AuthService } from "../services/auth";
import  {admin}  from "../database/config";
import bcrypt from "bcrypt";
import { PasswordResetService } from "../services/passwordReset";

export class UserController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await UserService.getAll();
      return res.status(200).json(users);
    } catch (error: any) {
      
      return res.status(500).json({ error: error.message });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const user = await UserService.getUserById(req.params.id);
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
      res.status(200).json(user);
    } catch (error) {
      return res.status(500).json({ error: "Error al obtener el usuario" });
    }
  }

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

  static async updateUser(req: Request, res: Response) {
    try {
      await UserService.updateUser(req.params.id, req.body);
      return res.status(200).json({ message: "Usuario actualizado" });
    } catch (error) {
      return res.status(500).json({ error: "Error al actualizar usuario" });
    }
  }

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
   * Maneja la solicitud de restablecimiento sin revelar si el correo existe.
   */
  static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;

    if (typeof email !== "string" || email.trim().length === 0) {
      return res.status(400).json({ error: "Email inválido" });
    }

    try {
      await PasswordResetService.requestPasswordReset(email);
      return res.status(200).json({ message: "Si el correo existe, recibirás instrucciones en breve" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message ?? "Error al procesar la solicitud" });
    }
  }

  /**
   * Permite definir una nueva contraseña a partir de un token válido.
   */
  static async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body;

    if (typeof token !== "string" || token.trim().length === 0) {
      return res.status(400).json({ error: "Token inválido" });
    }

    if (typeof password !== "string" || password.trim().length === 0) {
      return res.status(400).json({ error: "Contraseña inválida" });
    }

    try {
      await PasswordResetService.resetPassword(token, password);
      return res.status(200).json({ message: "Contraseña actualizada correctamente" });
    } catch (error: any) {
      const message: string = error?.message ?? "Error al restablecer la contraseña";
      const isClientError =
        message.includes("Token") ||
        message.includes("contraseña");

      return res.status(isClientError ? 400 : 500).json({ error: message });
    }
  }
}
