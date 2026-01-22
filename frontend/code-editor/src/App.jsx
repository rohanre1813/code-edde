import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./App.css";
import { socket } from "./components/socket";
import EditorWithSidebar from "./components/codespace";

function App() {
  const [joined, setjoined] = useState(false);
  const [roomid, setroomid] = useState("");
  const [username, setusername] = useState("");

  // Check localStorage session on load
  useEffect(() => {
  const session = JSON.parse(localStorage.getItem("session"));
  if (session?.roomid && session?.username) {
    socket.connect();
    socket.emit("join", { ...session, rejoin: true });
    setjoined(true);
    setroomid(session.roomid);
    setusername(session.username);
  }
}, []);


  const handledetails = () => {
    if (roomid && username) {
      socket.emit("join", { roomid, username });
      localStorage.setItem("session", JSON.stringify({ roomid, username }));
      setjoined(true);
    }
  };

  if (!joined) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0f172a] flex items-center justify-center px-4">
        {/* Animated blobs */}
        <motion.div animate={{ x: [0, 40, 0], y: [0, -40, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl" />
        <motion.div animate={{ x: [0, -40, 0], y: [0, 40, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl" />

        {/* Glass card */}
        <motion.div initial={{ opacity: 0, y: 60, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: "easeOut" }} className="relative z-10 w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8">
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-4xl font-bold text-white text-center">Join Room</motion.h1>
          <p className="text-slate-300 text-center mt-2">Connect instantly with your team</p>

          <div className="mt-10 space-y-6">
            <div>
              <label className="text-sm text-slate-300 mb-1 block">Room ID</label>
              <input onChange={(e) => setroomid(e.target.value)} type="text" placeholder="Enter room code" className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1 block">Username</label>
              <input onChange={(e) => setusername(e.target.value)} type="text" placeholder="Your display name" className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
            </div>
            <motion.button onClick={handledetails} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full mt-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition">
              Enter Room
            </motion.button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-8">Real-time • Secure • Ultra-fast</p>
        </motion.div>
      </div>
    );
  }

  return <EditorWithSidebar name={username} roomid={roomid} joined={setjoined} />;
}

export default App;
