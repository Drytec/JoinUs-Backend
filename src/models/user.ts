/**
 * User interface representing a user in the system.
 * @interface User
 */
export interface User {
  /**
   * Unique identifier for the user document in Firestore.
   * @type {string | undefined}
   */
  id?: string;

  /**
   * Unique identifier from Firebase Authentication.
   * @type {string | undefined}
   */
  uid?: string;

  /**
   * User's first name.
   * @type {string}
   */
  firstName: string;

  /**
   * User's last name.
   * @type {string}
   */
  lastName : string;

  /**
   * User's email address.
   * @type {string}
   */
  email: string;

  /**
   * User's age.
   * @type {number}
   */
  age: number;

  /**
   * User's hashed password (optional).
   * @type {string | undefined}
   */
  password? : string;
}
