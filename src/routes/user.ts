import { UserController } from "../controller/user";
import {Router} from "express"

const router = Router();

/**
 * Route to get all users.
 * @name get/
 * @function
 * @memberof module:routes/user
 * @inner
 */
router.get("/", UserController.getAllUsers);

/**
 * Route to register a new user.
 * @name post/register
 * @function
 * @memberof module:routes/user
 * @inner
 */
router.post("/register", UserController.registerUser);

/**
 * Route to update user information.
 * @name put/update
 * @function
 * @memberof module:routes/user
 * @inner
 */
router.put("/update",UserController.updateUser);

/**
 * Route to delete a user by ID.
 * @name delete/delete/:id
 * @function
 * @memberof module:routes/user
 * @inner
 */
router.delete("/delete/:id",UserController.deleteUser);

/**
 * Route to check if a user exists or register with a provider.
 * @name post/userExist
 * @function
 * @memberof module:routes/user
 * @inner
 */
router.post("/userExist",UserController.registerWithProvider);

/**
 * Route to complete registration for a provider user.
 * @name post/registerProvider
 * @function
 * @memberof module:routes/user
 * @inner
 */
router.post("/registerProvider",UserController.completeRegistration);

/**
 * Route to request a password reset.
 * @name post/forgot-password
 * @function
 * @memberof module:routes/user
 * @inner
 */
router.post("/forgot-password", UserController.forgotPassword);

/**
 * Route to reset password with a token.
 * @name post/reset-password
 * @function
 * @memberof module:routes/user
 * @inner
 */
router.post("/reset-password", UserController.resetPassword);

/**
 * Route to change password.
 * @name put/change-password
 * @function
 * @memberof module:routes/user
 * @inner
 */
router.put("/change-password", UserController.changePassword);


export default router;