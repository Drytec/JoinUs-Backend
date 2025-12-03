import { db } from "../database/config";
import { User } from "../models/user";

const usersCollection = db.collection("users");

/**
 * Service class for managing user data in Firestore.
 */
export class UserService {
  /**
   * Retrieves all users from the database.
   * @returns {Promise<User[]>} A promise that resolves to an array of users.
   */
  static async getAll(): Promise<User[]> {
    const snapshot = await usersCollection.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
  }

  /**
   * Retrieves a user by their document ID.
   * @param {string} id - The document ID of the user.
   * @returns {Promise<User | null>} A promise that resolves to the user object or null if not found.
   */
  static async getUserById(id: string): Promise<User | null> {
    const docRef = usersCollection.doc(id);
    const snap = await docRef.get();

    return snap.exists ? ({ id: snap.id, ...snap.data() } as User) : null;
  }

  /**
   * Retrieves a user by their email address, excluding the password.
   * @param {string | undefined} email - The email address of the user.
   * @returns {Promise<User | null>} A promise that resolves to the user object or null if not found.
   */
  static async getUserByEmail(email: string|undefined): Promise<User | null> {
    const snapshot = await usersCollection.where("email", "==", email).get();

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    const { password, ...userData } = userDoc.data();
    return { id: userDoc.id, ...userData } as User;
  }

  /**
   * Retrieves a user by their email address, including the password.
   * @param {string} email - The email address of the user.
   * @returns {Promise<User | null>} A promise that resolves to the user object or null if not found.
   */
  static async getUserByEmailP(email: string): Promise<User | null> {
    const snapshot = await usersCollection.where("email", "==", email).get();

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  }

  /**
   * Retrieves a user by their Firebase UID.
   * @param {string} uid - The Firebase UID of the user.
   * @returns {Promise<User | null>} A promise that resolves to the user object or null if not found.
   */
  static async getUserByUid(uid: string): Promise<User | null> {
    console.log("Searching for user with uid:", uid);
    const snapshot = await usersCollection.where("uid", "==", uid).get();

    console.log("Snapshot empty?", snapshot.empty);
    console.log("Snapshot size:", snapshot.size);

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    const data = userDoc.data();
    console.log("User document data:", data);
    
    const { password, ...userData } = data;
    const result = { id: userDoc.id, ...userData } as User;
    console.log("Returning user:", result);
    
    return result;
  }

  /**
   * Creates a new user in the database.
   * @param {User} user - The user object to create.
   * @returns {Promise<string>} A promise that resolves to the ID of the created user document.
   */
  static async createUser(user: User): Promise<string> {
    const docRef = await usersCollection.add(user);
    return docRef.id;
  }

  /**
   * Updates an existing user's information.
   * @param {string} id - The document ID of the user to update.
   * @param {Partial<User>} data - The data to update.
   * @returns {Promise<void>} A promise that resolves when the update is complete.
   */
  static async updateUser(id: string, data: Partial<User>): Promise<void> {
    await usersCollection.doc(id).update(data);
  }

  /**
   * Deletes a user from the database.
   * @param {string} id - The document ID of the user to delete.
   * @returns {Promise<void>} A promise that resolves when the deletion is complete.
   */
  static async deleteUser(id: string): Promise<void> {
    await usersCollection.doc(id).delete();
  }
}
