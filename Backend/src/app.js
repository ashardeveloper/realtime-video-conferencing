import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", process.env.PORT || 8000);
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);
app.get("/api/v1/turn-credentials", async (req, res) => {
  try {
    const appName = process.env.METERED_APP_NAME;
    const apiKey = process.env.METERED_API_KEY;

    if (!appName || !apiKey) {
      return res.status(200).json({
        iceServers: [{ urls: "stun:stun.relay.metered.ca:80" }],
      });
    }

    const response = await fetch(
      `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch TURN credentials");
    }

    const iceServers = await response.json();

    return res.status(200).json({ iceServers });
  } catch (error) {
    return res.status(200).json({
      iceServers: [{ urls: "stun:stun.relay.metered.ca:80" }],
    });
  }
});

app.get("/home", (req, res) => {
  return res.json({ hello: "World" });
});

const start = async () => {
  app.set("mongo_user");
  const connectionDb = await mongoose.connect(
    "mongodb+srv://asharmahmood714_db_user:aIIvg70H4roNqcol@cluster0.caxkbko.mongodb.net/",
  );
  server.listen(app.get("port"), () => {
    console.log("LISTENING ON PORT 8000");
  });
};

start();
