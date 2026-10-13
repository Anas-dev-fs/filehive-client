export default function LobbyActions({
  handleMyRoom,
  setMode,
  connected,
  loading,
}) {
  return (
    <div className="lobby-actions">
      {/* My Room */}
      <button
        className="btn btn-primary lobby-action-btn"
        onClick={handleMyRoom}
        disabled={!connected || loading}
      >
        <span className="lobby-action-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-file-user preview-icon"
          >
            <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
            <path d="M14 2v5a1 1 0 0 0 1 1h5" />
            <path d="M16 22a4 4 0 0 0-8 0" />
            <circle cx="12" cy="15" r="3" />
          </svg>
        </span>

        <span className="lobby-action-label">My Room</span>

        <span className="lobby-action-hint">
          Your personal room across all devices
        </span>
      </button>

      {/* Create Room */}
      <button
        className="btn btn-primary lobby-action-btn"
        onClick={() => setMode("create")}
        disabled={!connected || loading}
      >
        <span className="lobby-action-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-user-group preview-icon"
          >
            <path d="M17 21v-1a2 2 0 00-2-2H9a2 2 0 00-2 2v1" />
            <path d="M19 10h1a2 2 0 012 2v1" />
            <path d="M5 10H4a2 2 0 00-2 2v1" />
            <circle cx="12" cy="11" r="3" />
            <circle cx="18" cy="4" r="2" />
            <circle cx="6" cy="4" r="2" />
          </svg>
        </span>

        <span className="lobby-action-label">Create a Room</span>

        <span className="lobby-action-hint">
          Start a new session and invite teammates
        </span>
      </button>
    </div>
  );
}
