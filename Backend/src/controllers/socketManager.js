import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};
let users = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });
  // CORS config allows frontend (different origin) to connect to this socket server
  // without this, browser would block the connection

  io.on("connection", (socket) => {
    // Whenever any frontend connects using io.connect(), run this function.
    //"connection" is a built-in Socket.IO event triggered when a client connects, and "socket" is the unique connection object representing that specific client.
    console.log("SOMETHING CONNECTED");
    socket.on("join-call", (payload) => {
      const path = typeof payload === "string" ? payload : payload.path;
      const username =
        typeof payload === "string" ? "Guest" : payload.username || "Guest";

      if (connections[path] === undefined) {
        connections[path] = [];
      }

      if (users[path] === undefined) {
        users[path] = {};
      }

      if (!connections[path].includes(socket.id)) {
        connections[path].push(socket.id);
      }
      users[path][socket.id] = username;
      timeOnline[socket.id] = new Date();

      for (let a = 0; a < connections[path].length; a++) {
        io.to(connections[path][a]).emit(
          "user-joined",
          socket.id,
          connections[path],
          users[path],
        );
      }

      if (messages[path] !== undefined) {
        for (let a = 0; a < messages[path].length; a++) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][a]["data"],
            messages[path][a]["sender"],
            messages[path][a]["socket-id-sender"],
          );
        }
      }
    });
    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false],
      );
      // reduce loops through all rooms to find where current socket.id exists
      // once found, isFound becomes true → !isFound becomes false → stops further checking
      if (found === true) {
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = []; // if no previous messages in the room, create an empty array for that room
        }
        messages[matchingRoom].push({
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });
        // add the new message to the room's message array

        console.log("message", matchingRoom, ":", sender, data);
        connections[matchingRoom].forEach((socketId) => {
          io.to(socketId).emit("chat-message", data, sender, socket.id); // send the new message to all users in the room
        });
      }
    }); // listens when a user sends a chat message (data = message, sender = frontend name)

    socket.on("media-state-change", ({ video, audio }) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false],
      );

      if (found === true) {
        connections[matchingRoom].forEach((socketId) => {
          if (socketId !== socket.id) {
            io.to(socketId).emit("media-state-change", {
              socketId: socket.id,
              video,
              audio,
            });
          }
        });
      }
    });

    socket.on("disconnect", () => {
      // triggers when user disconnects (tab close, internet loss, or leaves app)
      var diffTime = Math.abs(timeOnline[socket.id] - new Date()); // calculate how long the user was online in seconds
      var key;

      for (const [k, v] of JSON.parse(
        JSON.stringify(Object.entries(connections)),
      )) {
        for (let a = 0; a < v.length; a++) {
          if (v[a] === socket.id) {
            key = k; // find the room that the user was in
            for (let a = 0; a < connections[key].length; a++) {
              io.to(connections[key][a]).emit("user-left", socket.id); // notify all users in the room that this user has disconnected and how long they were online
            }
            var index = connections[key].indexOf(socket.id);
            connections[key].splice(index, 1); // remove the user from the room's connection list

            if (users[key]) {
              delete users[key][socket.id];
            }
            if (connections[key].length === 0) {
              delete connections[key]; // if no users left in the room, delete the room
              delete users[key];
            }
          }
        }
      }
    });
  });
  return io;
};
