import admin from "firebase-admin";
import "dotenv/config";

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    // Handle private key - replace literal \n with actual newlines
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!process.env.FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.error("[ERROR] Firebase credentials are missing in .env file");
      console.error("[ERROR] FIREBASE_PROJECT_ID:", !!process.env.FIREBASE_PROJECT_ID);
      console.error("[ERROR] FIREBASE_PRIVATE_KEY:", !!privateKey);
      console.error("[ERROR] FIREBASE_CLIENT_EMAIL:", !!process.env.FIREBASE_CLIENT_EMAIL);
      throw new Error("Missing Firebase configuration");
    }

    // Replace escaped newlines with actual newlines
    // This handles both \n in .env file and actual newlines from Render
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: privateKey,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });

      console.log("[FIREBASE] Admin SDK initialized successfully");
    } catch (error: any) {
      console.error("[FIREBASE ERROR] Failed to initialize:", error.message);
      throw error;
    }
  }
};

// Initialize Firebase
initializeFirebase();

// Export Firestore instance
export const db = admin.firestore();
export { admin };