import { db } from "../database/config";
import { User } from "../models/user";

const usersCollection = db.collection("users");

/**
 * Service class that handles user data operations in Firestore
 * @class UserService
 */
export class UserService {
  /**
   * Retrieves all users from the database
   * @async
   * @returns {Promise<User[]>} Array of all users with their IDs
   */
  static async getAll(): Promise<User[]> {
    const snapshot = await usersCollection.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
  }

  /**
   * Retrieves a specific user by their document ID
   * @async
   * @param {string} id - User's document ID in Firestore
   * @returns {Promise<User | null>} User object if found, null otherwise
   */
  static async getUserById(id: string): Promise<User | null> {
    const docRef = usersCollection.doc(id);
    const snap = await docRef.get();

    return snap.exists ? ({ id: snap.id, ...snap.data() } as User) : null;
  }

  /**
   * Retrieves a user by their email address (without password field)
   * Used for authentication and user lookup where password is not needed
   * @async
   * @param {string | undefined} email - User's email address
   * @returns {Promise<User | null>} User object without password field if found, null otherwise
   */
  static async getUserByEmail(email: string|undefined): Promise<User | null> {
    const snapshot = await usersCollection.where("email", "==", email).get();

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    const { password, ...userData } = userDoc.data();
    return { id: userDoc.id, ...userData } as User;
  }

  /**
   * Retrieves a user by their email address (including password field)
   * Used for password reset operations where the password field is needed
   * The 'P' suffix indicates this method includes the password
   * @async
   * @param {string} email - User's email address
   * @returns {Promise<User | null>} Complete user object including password if found, null otherwise
   */
  static async getUserByEmailP(email: string): Promise<User | null> {
    const snapshot = await usersCollection.where("email", "==", email).get();

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  }

  /**
   * Creates a new user in the database
   * @async
   * @param {User} user - User object containing all user data
   * @returns {Promise<string>} Document ID of the newly created user
   */
  static async createUser(user: User): Promise<string> {
    const docRef = await usersCollection.add(user);
    return docRef.id;
  }

  /**
   * Updates an existing user's data
   * @async
   * @param {string} id - User's document ID
   * @param {Partial<User>} data - Partial user object with fields to update
   * @returns {Promise<void>}
   */
  static async updateUser(id: string, data: Partial<User>): Promise<void> {
    await usersCollection.doc(id).update(data);
  }

  /**
   * Deletes a user from the database
   * @async
   * @param {string} id - User's document ID to delete
   * @returns {Promise<void>}
   */
  static async deleteUser(id: string): Promise<void> {
    await usersCollection.doc(id).delete();
  }
}
