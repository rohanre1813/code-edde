
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
  const [output, setOutput] = useState("");
  const [version, setversion] = useState("*");
  const [tabStatus, setTabStatus] = useState("");

  // Language sync
  useEffect(() => {
    const handleLanguage = (lang) => setlanguage(lang);
    socket.on("languageupdate", handleLanguage);
    return () => socket.off("languageupdate", handleLanguage);
  }, []);

  // Users + typing + code sync
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

  // Leave room on refresh
  useEffect(() => {
    const handleUnload = () => {
      socket.emit("leaveroom");
      localStorage.removeItem("session");
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // Tab switch emit
  useEffect(() => {
    const handleVisibility = () => {
      socket.emit("tabswitch", {
        roomid,
        username: name,
        state: document.visibilityState,
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [roomid, name]);

  // Tab + output listener
  useEffect(() => {
    const handleTabStatus = ({ username, state }) => {
      if (state === "hidden")
        setTabStatus(`${username.slice(0, 8)}... switched tab`);
      else if (state === "visible")
        setTabStatus(`${username.slice(0, 8)}... came back`);

      setTimeout(() => setTabStatus(""), 3000);
    };

    socket.on("coderesponse", (response) => {
      setOutput(response.run.output);
    });

    socket.on("tabstatus", handleTabStatus);

    return () => {
      socket.off("tabstatus", handleTabStatus);
      socket.off("coderesponse");
    };
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
    socket.emit("compilecode", { roomid, code, language, version });
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-900 text-white overflow-hidden">

      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="w-full lg:w-80 xl:w-96 bg-gradient-to-b from-slate-800 to-slate-900 p-4 lg:p-6 flex flex-col overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-700"
      >
        <h2 className="text-xl font-bold mb-4">Room Info</h2>

        <div className="mb-4">
          <p className="text-sm text-slate-400">Room ID</p>
          <p className="font-semibold text-lg break-all">{roomid}</p>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-400">UserName</p>
          <p className="font-semibold text-lg">{name}</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={copy}
          className="py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 font-semibold"
        >
          Copy Room ID
        </motion.button>

        {/* Users */}
        <div className="mt-4 flex-1">
          <p className="text-sm text-slate-400 mb-2">Users</p>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {users.map((user, index) => (
              <motion.li
                key={index}
                className="flex items-center justify-between px-3 py-1 rounded-md hover:bg-slate-700"
              >
                {tabStatus && (
                  <span className="text-xs text-yellow-400 animate-pulse">
                    {tabStatus}
                  </span>
                )}
                <span>{user.slice(0, 8)}...</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <span className="text-xs text-green-400 mt-2">{typing}</span>

        {/* Language */}
        <div className="mt-4">
          <p className="text-sm text-slate-400 mb-1">Select Language</p>
          <Select
            options={languages}
            value={languages.find((l) => l.value === language)}
            onChange={(selectedOption) => {
              setlanguage(selectedOption.value);
              socket.emit("languagechange", {
                roomid,
                language: selectedOption.value,
              });
            }}
          />
        </div>

        <motion.button
          onClick={() => {
            socket.emit("leaveroom");
            localStorage.removeItem("session");
            joined(false);
          }}
          className="mt-4 py-2 rounded-xl bg-red-500 font-semibold"
        >
          Leave Room
        </motion.button>
      </motion.div>

      {/* Editor Section */}
      <div className="flex-1 flex flex-col p-3 lg:p-6 bg-slate-800 overflow-hidden">

        <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl p-3 lg:p-4 shadow-inner">

          {/* Editor */}
          <div className="flex-1 min-h-[250px] border border-slate-700 rounded-lg overflow-hidden">
            <Editor
              height="100%"
              value={code}
              language={language}
              theme="vs-dark"
              onChange={handlecode}
            />
          </div>

          {/* Run button */}
          <motion.button
            onClick={runCode}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-3 w-full sm:w-40 py-2 bg-green-500 rounded-xl font-semibold"
          >
            Run Code
          </motion.button>

          {/* Output */}
          <textarea
            className="mt-3 bg-black/70 text-white rounded-md p-3 h-[120px] sm:h-[140px] overflow-auto resize-none"
            value={output}
            readOnly
            placeholder="Output will appear here"
          />
        </div>
      </div>
    </div>
  );
}

