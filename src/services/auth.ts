import admin from "firebase-admin";

export class AuthService {
  static async register(email: string, password: string) {
   try {
    const userRecord = await admin.auth().createUser({ email, password });
    return userRecord;
  } catch (error: any) {
 
    throw new Error(error.message || "Error en Firebase Auth");
  }
  }


  static async deleteCurrentUser(uid: string) {
    try {
      await admin.auth().deleteUser(uid);
    } catch (error: any) {
      throw new Error(error.message || "Error al eliminar usuario");
    }
  }
}
