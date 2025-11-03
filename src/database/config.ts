import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA1but3mwMyKhqyEOv84BTgt5_vFg_H2TU",
  authDomain: "joinus-8e6e4.firebaseapp.com",
  projectId: "joinus-8e6e4",
  storageBucket: "joinus-8e6e4.firebasestorage.app",
  messagingSenderId: "912598838245",
  appId: "1:912598838245:web:9147b939435a8acd115d0c",
  measurementId: "G-Y2JJLRZZ9C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
