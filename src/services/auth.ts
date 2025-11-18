import admin from "firebase-admin";

/**
 * Service class that handles Firebase Authentication operations
 * @class AuthService
 */
export class AuthService {
  /**
   * Registers a new user in Firebase Authentication
   * @async
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<admin.auth.UserRecord>} Firebase user record containing uid and other user data
   * @throws {Error} Throws error if Firebase Auth registration fails
   */
  static async register(email: string, password: string) {
   try {
    const userRecord = await admin.auth().createUser({ email, password });
    return userRecord;
  } catch (error: any) {
 
    throw new Error(error.message || "Error en Firebase Auth");
  }
  }

  /**
   * Deletes a user from Firebase Authentication by their UID
   * @async
   * @param {string} uid - Firebase Authentication user ID
   * @returns {Promise<void>}
   * @throws {Error} Throws error if user deletion fails
   */
  static async deleteCurrentUser(uid: string) {
    try {
      await admin.auth().deleteUser(uid);
    } catch (error: any) {
      throw new Error(error.message || "Error al eliminar usuario");
    }
  }
}
