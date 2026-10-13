import React from "react";
import { MsLogo } from "../helpers/functions";

const JoinRoom = ({
  handleJoin,
  user,
  roomId,
  setRoomId,
  error,
  setError,
  connected,
  loading,
  setMode,
  MsLogo,
}) => {
  return (
    <form className="lobby-form" onSubmit={handleJoin}>
      <h2 className="form-title">Join Room</h2>
      <div className="field">
        <label>Joining as</label>
        <div className="id-chip">
          <div className="id-chip-avatar">{user.name[0].toUpperCase()}</div>
          <div className="id-chip-info">
            <span className="id-chip-name">{user.name}</span>
            <span className="id-chip-email">{user.email}</span>
          </div>
          <span className="id-chip-badge">
            <MsLogo /> Microsoft
          </span>
        </div>
      </div>
      <div className="field">
        <label>Room Code</label>
        <input
          placeholder="8-character code"
          value={roomId}
          onChange={(e) => {
            setRoomId(e.target.value.toUpperCase());
            setError("");
          }}
          className="mono input-code"
          maxLength={8}
          autoFocus
        />
      </div>
      {error && <div className="error-msg">{error}</div>}
      <div className="form-row">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setMode(null);
            setError("");
          }}
        >
          ← Back
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!connected || loading}
        >
          {loading ? "Joining…" : "Join Room"}
        </button>
      </div>
    </form>
  );
};

export default JoinRoom;
