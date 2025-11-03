import { UserController } from "../controller/user";
import {Router} from "express"

const router = Router();

router.get("/", UserController.getAllUsers);

router.post("/register", UserController.registerUser);

router.post("/login", UserController.loginUser);

router.post("/logout", UserController.logoutUser);

router.put("/update",UserController.updateUser);

router.delete("/delete",UserController.deleteUser);


export default router;