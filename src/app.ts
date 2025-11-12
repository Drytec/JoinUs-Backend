import express, { Request, Response } from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import userRoutes from "./routes/user"

dotenv.config();

const app = express();
if (!process.env.PORT) {
  process.exit(1);
}
const PORT: number = parseInt(process.env.PORT as string, 10);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/users", userRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.send("Backend API is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});


