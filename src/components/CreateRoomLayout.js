import React from "react";

const CreateRoomLayout = ({
  handleCreate,
  roomName,
  setRoomName,
  memberSearch,
  setMemberSearch,
  memberSearchRef,
  memberDropdownOpen,
  setMemberDropdownOpen,
  searching,
  displayedMembers,
  doSearch,
  selectedMembers,
  toggleMember,
  error,
  setError,
  connected,
  loading,
  setMode,
  setSelectedTeamId,
  loadingTeams,
  teams,
  selectedTeamId,
  channels,
  handleSelectTeam,
  handleChannelInvite,
  recentLoading,
  recentRooms,
  reinviteState,
  favouriteCount,
  handleToggleFavourite,
  handleDeleteRoom,
  handleRecreateRoom,
  formatRelative,
}) => {
  return (
    <div className="create-layout">
      {/* Left: form */}
      <div className="create-form-col">
        <form className="lobby-form" onSubmit={handleCreate}>
          <h2 className="form-title">Create Room</h2>
          <div className="field">
            <label>
              Room Name <span className="optional">(optional)</span>
            </label>

            <input
              placeholder="e.g. Q4 Design Sprint"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field room-members-field">
            <label>Invite Members</label>

            <div className="member-picker" ref={memberSearchRef}>
              <input
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => {
                  const value = e.target.value;

                  if (value.trim().length >= 0) {
                    setMemberSearch(value);

                    setMemberDropdownOpen(true);
                    doSearch(value);
                  } else {
                    setResults([]);
                  }
                }}
              />

              {memberDropdownOpen && (
                <div className="member-dropdown">
                  {searching ? (
                    <div className="member-dropdown-message">Searching...</div>
                  ) : displayedMembers.length === 0 ? (
                    <div className="member-dropdown-message">
                      No members found
                    </div>
                  ) : (
                    displayedMembers?.map((person) => {
                      const personId = person.id || person.userId;

                      const isSelected = selectedMembers.some(
                        (member) => (member.id || member.userId) === personId,
                      );

                      return (
                        <button
                          type="button"
                          key={personId}
                          className={`member-option ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => toggleMember(person)}
                        >
                          <div className="member-option-left">
                            <div className="member-avatar">
                              {(person.name ||
                                person.displayName ||
                                "?")[0].toUpperCase()}
                            </div>

                            <div className="member-details">
                              <strong>
                                {person.name || person.displayName}
                              </strong>

                              <span>
                                {person.email ||
                                  person.mail ||
                                  person.userPrincipalName ||
                                  ""}
                              </span>
                            </div>
                          </div>

                          <div className="member-check">
                            {isSelected ? "✓" : ""}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <div className="selected-members-chip-list">
              {selectedMembers?.map((item, index) => (
                <div
                  key={index}
                  className="selected-name-chip"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <span>{item.displayName}</span>
                  <svg
                    onClick={() => toggleMember(item)}
                    style={{ cursor: "pointer" }}
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-x preview-icon"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-row">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setMode(null);
                setError("");
                setSelectedTeamId(null);
              }}
            >
              ← Back
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!connected || loading}
            >
              {loading ? "Creating…" : "Create Room"}
            </button>
          </div>
        </form>

        {/* Channel quick-invite */}
        <div className="channel-invite-box">
          <h3 className="cib-title">
            <svg
              viewBox="0 0 23 23"
              width="14"
              height="14"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <rect x="1" y="1" width="10" height="10" fill="#F25022" />
              <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
              <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
              <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
            </svg>
            Create room for a channel
          </h3>
          <p className="cib-hint">
            Select a channel — a new room is created and the invite is posted
            directly to the channel feed.
          </p>
          {loadingTeams ? (
            <div className="tp-loading">
              <div className="spinner sm" />
              <span>Loading teams…</span>
            </div>
          ) : (
            <>
              <div className="cib-teams">
                {teams?.map((t) => (
                  <button
                    key={t.id}
                    className={`cib-team ${selectedTeamId === t.id ? "active" : ""}`}
                    onClick={() => handleSelectTeam(t.id)}
                  >
                    🏢 {t.displayName}
                  </button>
                ))}
              </div>
              {selectedTeamId && channels[selectedTeamId] && (
                <div className="cib-channels">
                  {(channels[selectedTeamId] || [])?.map((ch) => (
                    <button
                      key={ch.id}
                      className="cib-channel"
                      onClick={() =>
                        handleChannelInvite(
                          selectedTeamId,
                          ch.id,
                          ch.displayName,
                        )
                      }
                      disabled={loading}
                    >
                      <span className="cib-channel-hash">#</span>
                      <span>{ch.displayName}</span>
                      <span className="cib-channel-action">
                        Create &amp; post invite
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: recent rooms */}
      <div className="recent-rooms-col">
        <h3 className="rr-title">Recent Rooms</h3>
        <p className="rr-hint">
          Click to recreate with the same team — invites sent automatically.
        </p>
        {recentLoading && (
          <div className="tp-loading">
            <div className="spinner sm" />
          </div>
        )}
        {!recentLoading && recentRooms?.length === 0 && (
          <p className="rr-empty">No recent rooms yet.</p>
        )}
        <div className="heighted-rooms">
          {recentRooms?.map((room) => {
            const state = reinviteState[room.id] || "idle";
            const members = Array.from(
              new Map(
                [...(room.members || []), ...(room.pastMembers || [])]
                  ?.filter((m) => m.id || m.userId)
                  ?.map((m) => [m.id || m.userId, m]),
              )?.values(),
            );
            const memberCount = members?.length;
            const isFavourite = room?.favourite || false;
            const favouriteLimitReached = favouriteCount >= 3 && !isFavourite;
            return (
              <div
                key={room.id}
                className={`rr-card ${isFavourite ? "rr-card--favourite" : ""}`}
              >
                <div className="rr-card-top">
                  <div className="rr-card-header">
                    <div className="rr-card-name">{room.name}</div>
                    <div className="rr-card-actions">
                      {/* Favourite toggle */}
                      <button
                        type="button"
                        className={`rr-icon-btn rr-fav-btn ${
                          isFavourite ? "rr-fav-btn--active" : ""
                        }`}
                        onClick={() => handleToggleFavourite(room.id)}
                        disabled={favouriteLimitReached}
                        title={
                          isFavourite
                            ? "Unmark favourite"
                            : favouriteLimitReached
                              ? "You can only have 3 favourite rooms"
                              : "Mark as favourite"
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={isFavourite ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                      {/* Delete — disabled for favourites */}
                      {!isFavourite && (
                        <button
                          type="button"
                          className="rr-icon-btn rr-delete-btn"
                          onClick={() => handleDeleteRoom(room.id)}
                          title="Remove from recents"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="rr-card-meta">
                    <span>
                      {memberCount} member{memberCount !== 1 ? "s" : ""}
                    </span>
                    <span className="dot">·</span>
                    <span>{formatRelative(room.createdAt)}</span>
                    {/* {isFavourite && <span className="rr-fav-badge">★ Favourite</span>} */}
                  </div>
                  {members.length > 0 && (
                    <div className="rr-members">
                      {members.slice(0, 5)?.map((m) => (
                        <div key={m.id || m.userId} className="rr-member">
                          <div
                            className={`rr-avatar ${
                              m.invitationStatus === "pending"
                                ? "rr-avatar--pending"
                                : ""
                            }`}
                            title={
                              m.invitationStatus === "pending"
                                ? `${m.name || "Unknown"} — Invitation pending`
                                : `${m.name || "Unknown"} — ${
                                    m.online ? "Online" : "Offline"
                                  }`
                            }
                          >
                            {(m.name || "?")[0].toUpperCase()}
                          </div>

                          <span className="rr-member-name">
                            {m.name || "Unknown"}
                          </span>
                        </div>
                      ))}

                      {members.length > 5 && (
                        <div
                          className="rr-member-more"
                          title={`${members.length - 5} more members`}
                        >
                          +{members.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className={`btn btn-sm rr-btn ${state === "done" ? "btn-ghost" : "btn-primary"}`}
                  onClick={() => handleRecreateRoom(room)}
                  disabled={state === "sending" || state === "done"}
                  type="button"
                >
                  {state === "idle" && "Recreate & re-invite"}
                  {state === "sending" && (
                    <>
                      <span className="btn-mini-spinner" /> Inviting…
                    </>
                  )}
                  {state === "done" && "✓ Done"}
                  {state === "error" && "Retry"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CreateRoomLayout;
