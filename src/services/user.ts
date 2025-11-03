import { db } from "../database/config";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import {  query, where, } from "firebase/firestore";
import { User } from "../models/user";

const usersCollection = collection(db, "users");

export class UserService {
  static async getAll(): Promise<User[]> {
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
  }

   static async getUserById(id: string): Promise<User | null> {
    const ref = doc(db, "users", id);
    const snap = await getDoc(ref);

    return snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null;
  }

    static async getUserByEmail(email: string): Promise<User | null> {
    const q = query(usersCollection,where("email", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;


    const userDoc = snapshot.docs[0];
    const { password, ...userData } = userDoc.data(); 
    return { id: userDoc.id, ...userData } as User;
  }
    static async getUserByEmailP(email: string): Promise<User | null> {
    const q = query(usersCollection,where("email", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;


    const userDoc = snapshot.docs[0];
    const { ...userData } = userDoc.data(); 
    return { id: userDoc.id, ...userData } as User;
  }
  
  

  static async createUser(user: User): Promise<string> {
    const docRef = await addDoc(usersCollection, user);
    return docRef.id;
  }

  static async updateUser(id: string, data: Partial<User>): Promise<void> {
    const ref = doc(db, "users", id);
    await updateDoc(ref, data);
  }

  static async deleteUser(id: string): Promise<void> {
    const ref = doc(db, "users", id);
    await deleteDoc(ref);
  }
}
