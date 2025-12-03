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

// CORS configuration - Allow all Vercel deployments
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5100',
      'https://join-us-frontend.vercel.app'
    ];
    
    // Allow if origin is in the list OR contains 'vercel.app'
    if (allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * User routes.
 */
app.use("/api/users", userRoutes);
import admin from "firebase-admin";
import { error } from "console";

/**
 * Route to check Firebase connection.
 * @name get/fi
 * @function
 */
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

/**
 * Root route to check if the server is running.
 * @name get/
 * @function
 */
app.get("/", (_req: Request, res: Response) => {
  res.send("Backend API is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});


