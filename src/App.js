import { useState, useEffect, useRef } from "react";
import { MsalProvider } from "@azure/msal-react";
import { SocketProvider, useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import LoginPage from "./components/LoginPage";
import Lobby from "./components/Lobby";
import Room from "./components/Room";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import "./App.css";
import Swal from "sweetalert2";

const SESSION_KEY = "filehive_session";

function AppInner() {
  const { authState, user } = useAuth();
  const { socket, connected } = useSocket();
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const hasRestored = useRef(false);

  // Once authenticated + socket connects, try to restore a saved room session
  useEffect(() => {
    if (!user || !socket || !connected || hasRestored.current) return;
    hasRestored.current = true;

    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;

    let parsed;
    try {
      parsed = JSON.parse(saved);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return;
    }

    if (parsed.msUserId && parsed.msUserId !== user.id) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }

    setRestoring(true);
    const { roomId, userId, userName, isCreator } = parsed;
    socket.emit(
      "rejoin_room",
      { roomId, userId, userName, userEmail: user?.email },
      (res) => {
        if (!res?.success) {
          if (res?.kicked) {
            Swal.fire({
              icon: "warning",
              title: "Removed from room",
              text: "You have been removed from this room.",
              confirmButtonText: "OK",
            });
            setRestoring(false);
            return;
          }
        } else if (res.success) {
          setSession({ room: res.room, userId, userName, isCreator });
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
        setRestoring(false);
      },
    );
  }, [user, socket, connected]);

  // Re-register on socket reconnect
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      const saved = localStorage.getItem(SESSION_KEY);
      if (!saved || !session) return;
      try {
        const { roomId, userId, userName } = JSON.parse(saved);
        socket.emit(
          "rejoin_room",
          { roomId, userId, userName, userEmail: user?.email },
          (res) => {
            if (!res?.success) {
              if (res?.kicked) {
                Swal.fire({
                  icon: "warning",
                  title: "Removed from room",
                  text: "You have been removed from this room.",
                  confirmButtonText: "OK",
                });

                return;
              }
            } else if (res.success)
              setSession((s) => ({ ...s, room: res.room }));
            else {
              localStorage.removeItem(SESSION_KEY);
              setSession(null);
            }
          },
        );
      } catch {}
    };
    socket.on("connect", onConnect);
    return () => socket.off("connect", onConnect);
  }, [socket, session]);

  function handleJoined(sessionData) {
    setSession(sessionData);
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        roomId: sessionData.room.id,
        userId: sessionData.userId,
        userName: sessionData.userName,
        isCreator: sessionData.isCreator,
        msUserId: user?.id,
      }),
    );
  }

  function handleLeft() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  // 1. MSAL still initializing (handleRedirectPromise not yet resolved)
  if (authState === "initializing") {
    return (
      <div className="splash">
        <div className="logo-mark lg">⬡</div>
        <p className="splash-text">Loading…</p>
      </div>
    );
  }

  // 2. Not signed in → login page
  if (authState === "unauthenticated" || authState === "unconfigured") {
    return <LoginPage />;
  }

  // 3. Restoring room session
  if (restoring) {
    return (
      <div className="splash">
        <div className="logo-mark lg">⬡</div>
        <p className="splash-text">Restoring your session…</p>
      </div>
    );
  }

  // 4. In a room
  if (session) return <Room session={session} onLeft={handleLeft} />;

  // 5. Authenticated, no room → lobby
  return <Lobby onJoined={handleJoined} />;
}

// msalInstance is created in index.js and passed here as a prop.
// MsalProvider handles initialize() and handleRedirectPromise() internally.
export default function App({ msalInstance }) {
  // If MSAL isn't configured, render without MsalProvider
  if (!msalInstance) {
    return (
      <SocketProvider>
        <PWAInstallPrompt />
        <AppInner />
      </SocketProvider>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      <SocketProvider>
        <PWAInstallPrompt />
        <AppInner />
      </SocketProvider>
    </MsalProvider>
  );
}
