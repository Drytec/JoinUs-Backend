import admin from "firebase-admin";
import "dotenv/config";

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    try {
      console.log("[FIREBASE] Checking for FIREBASE_SERVICE_ACCOUNT_BASE64...", !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
      
      // Try to use service account JSON if available (for production)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        console.log("[FIREBASE] Using Base64 service account");
        const serviceAccount = JSON.parse(
          Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
        );
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        console.log("[FIREBASE] Admin SDK initialized with service account JSON");
        return;
      }
      
      console.log("[FIREBASE] Base64 not found, trying individual env vars");
      // Fallback to individual environment variables
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      if (!process.env.FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
        console.error("[ERROR] Firebase credentials are missing");
        console.error("[ERROR] FIREBASE_PROJECT_ID:", !!process.env.FIREBASE_PROJECT_ID);
        console.error("[ERROR] FIREBASE_PRIVATE_KEY:", !!privateKey);
        console.error("[ERROR] FIREBASE_CLIENT_EMAIL:", !!process.env.FIREBASE_CLIENT_EMAIL);
        throw new Error("Missing Firebase configuration");
      }

      // Replace escaped newlines with actual newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

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