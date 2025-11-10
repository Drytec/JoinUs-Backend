import admin from "firebase-admin";
import "dotenv/config";

let cachedAuth: admin.auth.Auth | null = null;

/**
 * Retrieves a singleton Firebase Admin Auth instance, lazily initializing the app.
 * Throws a descriptive error when no credentials are provided to avoid silent failures.
 */
export const getAdminAuth = (): admin.auth.Auth => {
  if (cachedAuth) {
    return cachedAuth;
  }

  if (!admin.apps.length) {
    const serviceAccountJson = process.env.FIREBASE_ADMIN_SDK;

    try {
      if (serviceAccountJson) {
        const credentials = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(credentials),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else {
        throw new Error(
          "Configura FIREBASE_ADMIN_SDK o GOOGLE_APPLICATION_CREDENTIALS para habilitar Firebase Admin."
        );
      }
    } catch (error) {
      throw new Error(
        `No se pudo inicializar Firebase Admin: ${error instanceof Error ? error.message : "Error desconocido"}`
      );
    }
  }

  cachedAuth = admin.auth();
  return cachedAuth;
};
