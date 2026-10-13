import React from "react";
import Invite from "../svg/Invite";
import RecycleBin from "../svg/RecycleBin";
import Members from "../svg/Members";

const RoomHeader = ({
  room,
  isPersonalRoom,
  isCreator,
  copyRoomCode,
  setIsChatDrawerOpen,
  setShowTeams,
  setShowMobileMembers,
  showMobileMembers,
  setShowRestore,
  handleLeave,
  handleEndRoom,
}) => {
  const onlineMembers =
    room?.members?.filter((member) => member.online).length || 0;

  const totalMembers = room?.members?.length || 0;

  return (
    <header className="room-header">
      <div className="room-header-left">
        <div className="logo-mark sm">⬡</div>

        <div className="room-info">
          <h1 className="room-name">{room.name}</h1>

          <button
            className="room-code mono"
            onClick={copyRoomCode}
            title="Click to copy"
          >
            #{room.id} <span className="copy-hint">copy</span>
          </button>
        </div>
      </div>

      <div className="room-header-right">
        {/* Chat */}
        {/* {!isPersonalRoom && (
          <button
            type="button"
            className="btn btn-sm teams-btn chat"
            onClick={() => setIsChatDrawerOpen(true)}
          >
            Chat
          </button>
        )} */}

        {/* Invite */}
        {!isPersonalRoom && (
          <button
            className="btn btn-sm teams-btn"
            onClick={() => {
              setShowTeams((prev) => {
                const next = !prev;

                if (next) {
                  sessionStorage.setItem(`teams-panel-seen-${room.id}`, "true");
                }

                return next;
              });
            }}
          >
            <Invite />
            <span>Invite</span>
          </button>
        )}

        {/* Members */}
        {!isPersonalRoom && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowMobileMembers(!showMobileMembers)}
          >
            <Members />
            <div>
              <span>Members </span>(
              <span className="online-member-count">
                {String(onlineMembers).padStart(2, "0")}
              </span>{" "}
              / {String(totalMembers).padStart(2, "0")})
            </div>
          </button>
        )}

        {/* Recycle Bin */}
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => {
            setShowRestore(true);
          }}
        >
          <RecycleBin />
          <span>Recycle Bin</span>
        </button>

        {/* Leave / End Session */}
        {isPersonalRoom || !isCreator ? (
          <button
            className="btn btn-danger btn-sm"
            style={{
              fontWeight: "bold",
              fontSize: "15px",
            }}
            onClick={handleLeave}
          >
            Leave Room
          </button>
        ) : (
          <button
            className="btn btn-danger btn-sm"
            style={{
              fontWeight: "bold",
              fontSize: "15px",
            }}
            onClick={handleEndRoom}
          >
            End Session
          </button>
        )}
      </div>
    </header>
  );
};

export default RoomHeader;
