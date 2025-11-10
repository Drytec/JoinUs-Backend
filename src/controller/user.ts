import { Request, Response } from "express";
import { UserService } from "../services/user";
import { AuthService } from "../services/auth";
import bcrypt from "bcrypt";
import { PasswordResetService } from "../services/passwordReset";

export class UserController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await UserService.getAll();
      return res.status(200).json(users);
      
    } catch (error) {
      console.error("🔥 Error en getAllUsers:", error);
      return res.status(500).json({ error: "Error al obtener usuarios" });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const user = await UserService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }
      res.status(200).json(user);
    } catch (error) {
       return res.status(500).json({ error: "Error al obtener el usuario" });
    }
  }

  static async registerUser(req: Request, res: Response) {
    try {
        const { email, firstName, lastName,age, password } = req.body;
        const data= req.body;
        const pass = await UserService.getUserByEmail(email)
        
        if (pass !== null){
            return res.status(400).json({error:"Usuario ya existe"})
        }


        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof email !== "string" || !emailRegex.test(email)) {
        return res.status(400).json({ error: "Email inválido" });
        }

        if (typeof firstName !== "string" || firstName.trim().length === 0) {
        return res.status(400).json({ error: "Nombre inválido" });
        }
        if (typeof lastName !== "string" || lastName.trim().length === 0) {
        return res.status(400).json({ error: "Apellido inválido" });
        }

        const ageNum = Number(age);
        if (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
        return res.status(400).json({ error: "Edad inválida" });
        }

        const passwordStr =
        typeof password === "string"
            ? password
            : typeof password === "number"
            ? String(password)
            : null;

        if (!passwordStr || passwordStr.length < 8) {
        return res
            .status(400)
            .json({ error: "La contraseña debe tener al menos 8 caracteres" });
        }

        const forbiddenPatterns = [
        /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b)/i, // SQL keywords
        /(\bUNION\b|\bOR\b.*=.*\b|\bAND\b.*=.*\b)/i, // SQL injection patterns
        /['"`;\\]/g,
        /^\s+$/,
        ];

        const hasForbiddenPattern = forbiddenPatterns.some((pattern) =>
        pattern.test(passwordStr),
        );
        if (hasForbiddenPattern) {
        return res.status(400).json({
            error: "La contraseña contiene caracteres o patrones no permitidos",
        });
        }

        if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(passwordStr)) {
        return res.status(400).json({
            error: "La contraseña debe contener al menos una letra y un número",
        });
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const existing = await UserService.getUserByEmail(data.email);
        if (existing) {
        return res.status(409).json({ error: "El email ya está registrado" });
        }

        const newUserData = {
            email,
            firstName,
            lastName,
            age,
            password: hashedPassword
        };

        const auth = await AuthService.register(email,password);
        const created = await UserService.createUser(newUserData);
         const { password: _, ...userWithoutPassword } = newUserData;

        return res.status(201).json({message:"Registro Exitoso",user:userWithoutPassword});
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
  }
 static async loginUser(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        

        const user = await UserService.getUserByEmailP(email);
        if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
        }
        console.log(user.password)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
        return res.status(401).json({ error: "Contraseña incorrecta" });
        }
        const userCredential = await AuthService.login(email, password);
        const data = await UserService.getUserByEmail(email);
        const token = await userCredential.user.getIdToken(true);

        return res.status(200).json({
            message: "Inicio de sesión exitoso",
            token,
            data,
        });
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }
  }

  static async logoutUser(req: Request, res: Response) {
    try {
      await AuthService.logout();
      return res.status(200).json({ message: "Sesión cerrada correctamente" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
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
      await AuthService.deleteCurrentUser()
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
