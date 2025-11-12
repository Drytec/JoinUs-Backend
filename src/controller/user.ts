import { Request, Response } from "express";
import { UserService } from "../services/user";
import { AuthService } from "../services/auth";
import bcrypt from "bcrypt";

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
}
