import { motion } from "framer-motion";
import Select from "react-select";
import Editor from "@monaco-editor/react";
import { useState, useEffect } from "react";
import { socket } from "./socket";

export default function EditorWithSidebar({ name, roomid, joined }) {
  const [language, setlanguage] = useState("javascript");
  const [code, setcode] = useState("// Your code here");
  const [users, setusers] = useState([]);
  const [typing, settyping] = useState("");
  const [output, setOutput] = useState([]);
  const[version,setversion]=useState("*")
  const [tabStatus, setTabStatus] = useState("");

  // Language updates from server
  useEffect(() => {
    const handleLanguage = (lang) => setlanguage(lang);
    socket.on("languageupdate", handleLanguage);
    return () => socket.off("languageupdate", handleLanguage);
  }, []);


  // Users, typing, and code updates
  useEffect(() => {
    const handleUsers = (users) => setusers(users);
    socket.on("codeupdate", (newCode) => setcode(newCode));
    socket.on("userjoined", handleUsers);
    socket.on("usertyping", (username) => {
      settyping(`${username.slice(0, 8)}... is typing`);
      setTimeout(() => settyping(""), 3000);
    });
    return () => {
      socket.off("userjoined", handleUsers);
      socket.off("codeupdate");
      socket.off("usertyping");
    };
  }, []);

  // Leave room on unload
  useEffect(() => {
  const handleUnload = () => {
    socket.emit("leaveroom");

    localStorage.removeItem("session");
  };

  window.addEventListener("beforeunload", handleUnload);

  return () => window.removeEventListener("beforeunload", handleUnload);
}, []);


  // Tab switch detection (emit)
  useEffect(() => {
    const handleVisibility = () => {
      socket.emit("tabswitch", {
        roomid,
        username: name,
        state: document.visibilityState,
      });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [roomid, name]);

  // Listen for other users' tab switch
  useEffect(() => {
    const handleTabStatus = ({ username, state }) => {
      if (state === "hidden") setTabStatus(`${username.slice(0, 8)}... switched tab`);
      else if (state === "visible") setTabStatus(`${username.slice(0, 8)}... came back`);
      setTimeout(() => setTabStatus(""), 3000);
    };
    socket.on("coderesponse",(response)=>{
      setOutput(response.run.output)
      
    })
    socket.on("tabstatus", handleTabStatus);
    return () => {socket.off("tabstatus", handleTabStatus);
      socket.off("coderesponse")
    }

  }, []);

  const handlecode = (newCode) => {
    if (typeof newCode !== "string") return;
    setcode(newCode);
    socket.emit("codechange", { roomid, code: newCode });
    socket.emit("typing", { roomid, username: name });
  };

  const languages = [
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
  ];

  const copy = () => navigator.clipboard.writeText(roomid);

    const runCode = () => {
      socket.emit("compilecode", { roomid, code,language,version });
    };

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="w-80 bg-gradient-to-b from-slate-800 to-slate-900 p-6 flex flex-col"
      >
        <h2 className="text-xl font-bold mb-4">Room Info</h2>
        <div className="mb-6">
          <p className="text-sm text-slate-400">Room ID</p>
          <p className="font-semibold text-lg">{roomid}</p>
        </div>
        <div className="mb-6">
          <p className="text-sm text-slate-400">UserName</p>
          <p className="font-semibold text-lg">{name}</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={copy}
          className="mt-0.8 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white font-semibold shadow-lg hover:shadow-indigo-500/40 transition"
        >
          Copy To Clipboard
        </motion.button>

        {/* Users */}
        <div className="mb-6">
          <p className="text-sm text-slate-400 mb-2">Users</p>
          <ul className="space-y-2">
            {users.map((user, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between px-3 py-1 rounded-md hover:bg-slate-700 transition"
              >
                {tabStatus && <span className="text-xs text-yellow-400 animate-pulse">{tabStatus}</span>}
                <span>{user.slice(0, 8)}...</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <span className="text-xs text-green-400 animate-pulse">{typing}</span>

        {/* Language Selection */}
        <div className="mb-4">
          <p className="text-sm text-slate-400 mb-1">Select Language</p>
          <Select
            options={languages}
            value={languages.find((l) => l.value === language)}
            onChange={(selectedOption) => {
              setlanguage(selectedOption.value);
              socket.emit("languagechange", { roomid, language: selectedOption.value });
            }}
            placeholder="Choose language..."
            styles={{
              control: (provided) => ({ ...provided, backgroundColor: "#1e293b", borderColor: "#334155", color: "white" }),
              menu: (provided) => ({ ...provided, backgroundColor: "#1e293b" }),
              singleValue: (provided) => ({ ...provided, color: "white" }),
              option: (provided, state) => ({ ...provided, backgroundColor: state.isFocused ? "#334155" : "#1e293b", color: "white" }),
            }}
          />
        </div>

        {/* Confirm & Leave */}
        <motion.button className="mt-auto py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white font-semibold shadow-lg hover:shadow-indigo-500/40 transition">
          Confirm Language
        </motion.button>
        <motion.button
          onClick={() => {
            socket.emit("leaveroom");
            localStorage.removeItem("session");
            joined(false);
          }}
          className="mt-2 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white font-semibold shadow-lg hover:shadow-indigo-500/40 transition"
        >
          Leave Room
        </motion.button>
      </motion.div>

      {/* Editor + Output */}
      <div className="flex-1 p-6 bg-slate-800 overflow-auto flex flex-col">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 w-full bg-slate-900 rounded-2xl p-4 shadow-inner flex flex-col"
        >
          <p className="text-slate-500 mb-2">Your code editor will appear here.</p>
          <div className="h-87 border-2 border-slate-700 rounded-lg p-2 bg-slate-800">
            <Editor height="100%" value={code} language={language} theme="vs-dark" onChange={handlecode} />
          </div>

           
            <motion.button
              onClick={runCode}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-4 py-2 rounded-xl bg-green-500 text-white font-semibold shadow-lg hover:shadow-green-400/40 transition"
            >
              Run Code
            </motion.button>
          

          <textarea className="mt-4 bg-black/70 text-white rounded-md p-3 h-25 overflow-auto" value={output} readOnly placeholder="output will appear here">
        
          </textarea>
        </motion.div>
      </div>
    </div>
  );
}
