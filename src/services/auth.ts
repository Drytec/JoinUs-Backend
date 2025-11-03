import { auth } from "../database/config";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
  deleteUser
} from "firebase/auth";

export class AuthService {
  static async register(email: string, password: string): Promise<UserCredential> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  }
    static async deleteCurrentUser(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");

    await deleteUser(user);
    }
  static async login(email: string, password: string): Promise<UserCredential> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  }

  static async logout(): Promise<void> {
    await signOut(auth);
  }
}
