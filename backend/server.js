import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import { startSessionScheduler } from "./jobs/sessionScheduler.js";

// Route imports
import courseRoute from "./routes/courseRoute.js";
import adminRoute from "./routes/adminRoute.js";
import studentRoute from "./routes/studentRoute.js";
import lecturerRoute from "./routes/lecturerRoute.js";
import attendanceRoute from "./routes/attendanceRoute.js";
import qrSessionRoute from "./routes/qrSessionRoute.js";
import faceDataRoute from "./routes/faceDataRoute.js";
import notificationRoute from "./routes/notificationRoute.js";
import settingsRoute from "./routes/settingsRoutes.js";

import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

// App config
const app = express();
const port = process.env.PORT || 4000;

// Connect to database
connectDB();

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// API endpoints
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Hybrid Mobile-Based Student Attendance System API",
    version: "1.0.0",
    status: "Running",
  });
});

// Routes
app.use("/api/admin", adminRoute);
app.use("/api/student", studentRoute);
app.use("/api/lecturer", lecturerRoute);
app.use("/api/course", courseRoute);
app.use("/api/attendance", attendanceRoute);
app.use("/api/qrsession", qrSessionRoute);
app.use("/api/facedata", faceDataRoute);
app.use("/api/notification", notificationRoute);
app.use('/api/settings', settingsRoute);

// Error Middleware
app.use(notFound);
app.use(errorHandler);

startSessionScheduler();

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is started on http://0.0.0.0:${port}`);
});