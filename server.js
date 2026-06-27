// const express = require("express");
// const cookieParser = require('cookie-parser');
// require('dotenv').config();
// const cors = require("cors");
// const bodyParser = require("body-parser");


// const authRoutes = require("./Routes/auth");

// const app = express();
// app.use(express.json());
// app.use(cookieParser());
// app.use(bodyParser.json());

// app.use(
//   cors({
//     origin: true,
//     credentials: true,
//   }),
// );

// // Enable CORS for all routes
// app.use(
//   cors({
//     origin: "http://localhost:5173", 
//     credentials: true,
//   }),
// );


// app.use('/api/auth', authRoutes);

// const PORT = 5555;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


// server.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Catch unhandled crashes and log them before process dies
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err.message, err.stack);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

const express = require("express");
const http = require("http");
const cors = require("cors");
const { connectDB } = require("./database");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

// Auth routes only (others commented out)
const authRoutes = require("./Routes/auth");

// Comment out other route imports
// const subscribeRoutes = require("./Routes/System_Notification/Push_notification");
const roleRoutes = require("./Routes/Settings/roleRoutes");
const departmentRoutes = require("./Routes/Settings/departmentRoutes");
const employeeRoutes = require("./Routes/employeeRoutes");
// const attendanceRoutes = require("./Routes/attendanceRoutes");
// const performanceReviewRoutes = require("./Routes/PerformanceReview");
// const PerformMaagementSystem = require("./Routes/performanceRoutes");
// const policyRoutes = require("./Routes/Policy/policies");
// const resourceRoutes = require("./Routes/Policy/resources");
const teamRoutes = require("./Routes/teamRoutes");
// const pulseRoutes = require("./Routes/Pulse");
// const logoRoutes = require("./Routes/LogoRoutes/Logo.routes");
// const leaveRoutes = require("./Routes/Leave");
// const moodRoutes = require("./Routes/moodRoutes");
// const coordinateRoutes = require('./Routes/Coordinate/coordinateRoutes');
// const officeZoneRoutes = require("./Routes/Coordinate/officeZoneRoutes");
// const attendancePolicy = require("./Routes/AttendancePolicy/attendancePolicyRoutes");
const departmentHeadRoutes = require("./Routes/departmentHeadRoutes");
// const regularizationRoutes = require("./Routes/regularizationRoutes");
// const organizationSettingsRoutes = require("./Routes/Settings/organizationSettingsRoutes");
// const concernRoutes = require("./Routes/Concerns/concernRoutes");
// const payrollRoutes = require("./Routes/Payroll/payrollRoutes");
// const weatherRoutes = require("./Routes/Weathers/weatherRoutes");

const app = express();
const server = http.createServer(app);

// Socket.IO setup - Comment out if not needed
/*
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://localhost:3000",
      "https://hrms.rm-dev1.com",
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Initialize team chat socket and export for use in controllers
const setupTeamChatSocket = require("./sockets/teamChatSocket");
const teamChatSocket = setupTeamChatSocket(io);
app.set("teamChatSocket", teamChatSocket);
*/

// Connect to PostgreSQL
connectDB().then(() => {
  console.log('Database connected and synced');
}).catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    setHeaders: (res, path) => {
      if (
        path.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|png|jpg|jpeg|gif|webp)$/)
      ) {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Disposition", "inline");
      }
    },
  }),
);

// Middleware
app.use(helmet());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to HRMS Backend with PostgreSQL..");
});

// Mount auth routes only
app.use("/api/auth", authRoutes);

// Comment out all other route mounts
// app.use("/api/subscribe", subscribeRoutes);
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/roles", roleRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/employees", employeeRoutes);
// app.use("/api/attendance", attendanceRoutes);
// app.use("/api/performance-reviews", performanceReviewRoutes);
// app.use("/api/performance", PerformMaagementSystem);
// app.use("/api/policies", policyRoutes);
// app.use("/api/resources", resourceRoutes);
app.use("/api/team", teamRoutes);
// app.use("/api/pulse", pulseRoutes);
// app.use("/api/logos", logoRoutes);
// app.use("/api/leaves", leaveRoutes);
// app.use("/api/mood", moodRoutes);
// app.use('/api/coordinates', coordinateRoutes);
// app.use("/api/office-zones", officeZoneRoutes);
// app.use("/api/attendance-policies", attendancePolicy)
app.use("/api/department-head", departmentHeadRoutes);
// app.use("/api/regularization", regularizationRoutes);
// app.use("/api/org-settings", organizationSettingsRoutes);
// app.use('/api/concerns', concernRoutes);
// app.use("/api/payroll", payrollRoutes);
// app.use("/api/weather", weatherRoutes);

const PORT = process.env.PORT || 5555;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // console.log(`WebSocket server ready`);
});