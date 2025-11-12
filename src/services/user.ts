import { db } from "../database/config";
import { User } from "../models/user";

const usersCollection = db.collection("users");

export class UserService {
  static async getAll(): Promise<User[]> {
    const snapshot = await usersCollection.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
  }

  static async getUserById(id: string): Promise<User | null> {
    const docRef = usersCollection.doc(id);
    const snap = await docRef.get();

    return snap.exists ? ({ id: snap.id, ...snap.data() } as User) : null;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const snapshot = await usersCollection.where("email", "==", email).get();

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    const { password, ...userData } = userDoc.data();
    return { id: userDoc.id, ...userData } as User;
  }

  static async getUserByEmailP(email: string): Promise<User | null> {
    const snapshot = await usersCollection.where("email", "==", email).get();

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  }

  static async createUser(user: User): Promise<string> {
    const docRef = await usersCollection.add(user);
    return docRef.id;
  }

  static async updateUser(id: string, data: Partial<User>): Promise<void> {
    await usersCollection.doc(id).update(data);
  }

  static async deleteUser(id: string): Promise<void> {
    await usersCollection.doc(id).delete();
  }
}
