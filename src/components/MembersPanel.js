import React from "react";

const MembersPanel = ({
  room,
  session,
  setShowMobileMembers,
  reinviteLoading,
  handleReInvite,
  handleKickoutMember,
}) => {
  const members = Array.from(room?.members?.values?.() || []);

  const onlineCount = members.filter((member) => member.online).length;

  const sortedMembers = members.sort((a, b) => {
    const getPriority = (member) => {
      if (member.id === room.creatorId) return 0;
      if (member.online) return 1;
      if (member.invitationStatus !== "pending") return 2;
      return 3;
    };

    const priorityDiff = getPriority(a) - getPriority(b);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <div
        className="panel-overlay"
        onClick={() => setShowMobileMembers(false)}
      />

      <div className="side-drawer">
        <div className="side-drawer-header">
          <h3>
            Members (
            <span className="online-member-count">
              {String(onlineCount).padStart(2, "0")}
            </span>{" "}
            / {String(members.length).padStart(2, "0")})
          </h3>

          <button
            className="sd-close"
            onClick={() => setShowMobileMembers(false)}
          >
            ✕
          </button>
        </div>

        <div className="side-drawer-body">
          {members.length === 0 ? (
            <div className="sd-empty">No members online</div>
          ) : (
            sortedMembers.map((member) => (
              <div
                key={member.id}
                className={`member-item ${!member.online ? "offline" : ""}`}
              >
                <div className="member-avatar">
                  {member.name[0].toUpperCase()}
                </div>

                <div className="member-info">
                  <div className="member-name">{member.name}</div>

                  {/* Host badge */}
                  {member.id === room.creatorId && (
                    <span className="member-badge you">Host</span>
                  )}

                  {/* Pending invitation */}
                  {member.id !== session.userId &&
                    member.invitationStatus === "pending" && (
                      <span className="member-badge pending-invite">
                        Pending Invitation
                      </span>
                    )}

                  {/* Offline */}
                  {member.id !== session.userId &&
                    member.invitationStatus !== "pending" &&
                    !member.online && (
                      <span className="member-badge offline">Disconnected</span>
                    )}
                </div>

                {/* Re-invite */}
                {member.id !== session.userId &&
                  member.invitationStatus !== "pending" &&
                  !member.online && (
                    <button
                      className="btn teams-btn btn-sm"
                      style={{ marginRight: "2px" }}
                      disabled={reinviteLoading}
                      onClick={() => handleReInvite(member)}
                    >
                      {reinviteLoading ? (
                        <span className="btn-mini-spinner" />
                      ) : (
                        "Re-Invite"
                      )}
                    </button>
                  )}

                {/* Kickout - Host only */}
                {session.userId === room.creatorId &&
                  member.id !== room.creatorId && (
                    <button
                      className="btn teams-btn btn-sm kickout"
                      onClick={() => handleKickoutMember(member)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-log-out preview-icon"
                      >
                        <path d="m16 17 5-5-5-5" />
                        <path d="M21 12H9" />
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      </svg>
                    </button>
                  )}

                <div className="member-status-dot" />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default MembersPanel;
