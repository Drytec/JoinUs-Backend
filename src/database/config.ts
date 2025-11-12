import admin from "firebase-admin";
import "dotenv/config";

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    
    if (!process.env.FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.error("[ERROR] Firebase credentials are missing in .env file");
      throw new Error("Missing Firebase configuration");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });

    console.log("[FIREBASE] Admin SDK initialized successfully");
  }
};

// Initialize Firebase
initializeFirebase();

// Export Firestore instance
export const db = admin.firestore();