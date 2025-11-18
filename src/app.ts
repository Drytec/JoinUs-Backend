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
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5100',
      'https://join-us-frontend.vercel.app',
      process.env.FRONTEND_URL
    ];
    
    // Allow Vercel preview deployments
    if (!origin || allowedOrigins.includes(origin) || origin?.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/users", userRoutes);
import admin from "firebase-admin";
import { error } from "console";

app.get("/fi", (req, res) => {
  try {
    const app = admin.app();
    console.log("ENV PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("ENV CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("ENV PRIVATE_KEY_EMPTY?:", process.env.FIREBASE_PRIVATE_KEY ? "NO" : "YES");
    res.json({
  
      message: "Firebase Admin conectado correctamente",
      projectId: app.options.projectId,
      
    });

  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err)
    });
  }
});
app.get("/", (_req: Request, res: Response) => {
  res.send("Backend API is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});


