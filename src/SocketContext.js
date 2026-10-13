// import { createContext, useContext, useEffect, useRef, useState } from "react";
// import { io } from "socket.io-client";

// const SocketContext = createContext(null);

// export function SocketProvider({ children }) {
//   const socketRef = useRef(null);
//   const [connected, setConnected] = useState(false);

//   useEffect(() => {
//     const socket = io(process.env.REACT_APP_BACKEND_API_URL, { autoConnect: true, transports: ["websocket", "polling"] });
//     socketRef.current = socket;
//     socket.on("connect", () => setConnected(true));
//     socket.on("disconnect", () => setConnected(false));
//     return () => socket.disconnect();
//   }, []);

//   return (
//     <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
//       {children}
//     </SocketContext.Provider>
//   );
// }

// export function useSocket() {
//   return useContext(SocketContext);
// }

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_BACKEND_API_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    const handleConnect = () => {
      setConnected(true);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);

    return () => {
      newSocket.off("connect", handleConnect);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
