import { UserController } from "../controller/user";
import {Router} from "express"

const router = Router();

router.get("/", UserController.getAllUsers);

router.post("/register", UserController.registerUser);

router.put("/update",UserController.updateUser);

router.delete("/delete",UserController.deleteUser);

router.post("/userExist",UserController.registerWithProvider);

router.post("/registerProvider",UserController.completeRegistration);

router.post("/forgot-password", UserController.forgotPassword);

router.post("/reset-password", UserController.resetPassword);


export default router;