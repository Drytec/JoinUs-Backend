import { UserController } from "../controller/user";
import {Router} from "express"

const router = Router();

router.get("/", UserController.getAllUsers);

router.post("/register", UserController.registerUser);

router.put("/update",UserController.updateUser);

router.delete("/delete",UserController.deleteUser);


export default router;