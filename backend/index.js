import axios from "axios";
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const url = `https://render-hosting-se2b.onrender.com`;
const interval = 30000;

function reloadWebsite() {
  axios
    .get(url)
    .then((response) => {
      console.log("website reloded");
    })
    .catch((error) => {
      console.error(`Error : ${error.message}`);
    });
}

setInterval(reloadWebsite, interval);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  let currentroom = null;
  let currentuser = null;

  socket.on("join", ({ roomid, username }) => {
    if (currentroom) {
      socket.leave(currentroom);
      if (rooms.has(currentroom)) rooms.get(currentroom).delete(currentuser);
      io.to(currentroom).emit("userjoined", Array.from(rooms.get(currentroom)));
    }

    currentroom = roomid;
    currentuser = username;
    socket.join(roomid);
    if (!rooms.has(roomid)) rooms.set(roomid, new Set());
    rooms.get(roomid).add(username);
    io.to(roomid).emit("userjoined", Array.from(rooms.get(roomid)));
  });

  socket.on("codechange", ({ roomid, code }) => {
    socket.to(roomid).emit("codeupdate", code);
  });

  socket.on("runcode", ({ roomid, code }) => {
    io.to(roomid).emit("codeexecuted", code);
  });

  socket.on("tabswitch", ({ roomid, username, state }) => {
    socket.to(roomid).emit("tabstatus", { username, state });
  });

  socket.on("leaveroom", () => {
    if (currentroom && currentuser) {
      rooms.get(currentroom).delete(currentuser);
      io.to(currentroom).emit("userjoined", Array.from(rooms.get(currentroom)));
    }
    socket.leave(currentroom);
    currentroom = null;
    currentuser = null;
  });

  socket.on("typing", ({ roomid, username }) => {
    if (!roomid || !username) return;
    socket.to(roomid).emit("usertyping", username);
  });

  socket.on("languagechange", ({ roomid, language }) => {
    io.in(roomid).emit("languageupdate", language);
  });
  socket.on("compilecode",async({roomid,code,language,version})=>{
    if(rooms.has(roomid)){
      const room=rooms.get(roomid)
      const response=await axios.post("https://emkc.org/api/v2/piston/execute",
        {
          language,
          version,
          files:[{
            content:code
          }]
        }
      )
      room.output=response.data.run.output
      io.to(roomid).emit("coderesponse",response.data)
    }
  })
  socket.on("disconnect", () => {
    if (currentroom && currentuser) {
      rooms.get(currentroom).delete(currentuser);
      io.to(currentroom).emit("userjoined", Array.from(rooms.get(currentroom)));
    }
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
