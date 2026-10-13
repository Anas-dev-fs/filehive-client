import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { createInviteToken } from "../InviteToken";

// Per-person invite state: idle | sending | sent | failed | copied
export function useInviteStates() {
  const [states, setStates] = useState({});
  const set = (id, status, error) =>
    setStates(s => ({ ...s, [id]: { status, error } }));
  const get = (id) => states[id] || { status: "idle" };
  return { get, set };
}

export default function TeamsPanel({ room, onClose, socket }) {
  const { user, searchUsers, getMyTeams, getTeamMembers, sendTeamsInvite } = useAuth();
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteStatus, setInviteStatus] = useState({});
  // const inviteStates = useInviteStates();
  const searchTimer = useRef(null);

  // Plain room link — shown in the link bar for sharing manually
  const roomLink = window.location.origin + "?room=" + room.id;

  // ── Send encrypted Teams message invite ───────────────────────────────────
  async function sendInvite(person) {
    const personId = person.id || person.userId;
    const personEmail = person.mail || person.userPrincipalName || "";
    const personName = person.displayName || person.name || "";

    if (!personId || !personEmail) {
      await copyFallback(person);
      return;
    }

    // IMMEDIATELY show spinner
    setInviteStatus(prev => ({
      ...prev,
      [personId]: "sending",
    }));

    try {
      // 1. Send actual Teams invitation
      const result = await sendTeamsInvite(
        personId,
        personEmail,
        room.id,
        room.name
      );

      if (!result?.success) {
        setInviteStatus(prev => ({
          ...prev,
          [personId]: "failed",
        }));

        console.warn("Teams invite failed:", result?.error);

        await copyFallback(person);
        return;
      }

      // 2. Teams invite succeeded.
      // Tell server to add this person to the room's member list.
      socket.emit(
        "add_room_invited_member",
        {
          roomId: room.id,
          member: {
            id: personId,
            name: personName,
            email: personEmail,
          },
        },
        (response) => {
          if (!response?.success) {
            console.error(
              "Failed to add invited member:",
              response?.error
            );

            setInviteStatus(prev => ({
              ...prev,
              [personId]: "failed",
            }));

            return;
          }

          // 3. Server successfully registered the invitation
          setInviteStatus(prev => ({
            ...prev,
            [personId]: "sent",
          }));
        }
      );
    } catch (error) {
      console.error("Invitation error:", error);

      setInviteStatus(prev => ({
        ...prev,
        [personId]: "failed",
      }));
    }
  }

  // Fallback: build encrypted link and copy to clipboard
  async function copyFallback(person) {
    const personId = person.id || person.userId;
    const personEmail = person.mail || person.userPrincipalName || "";
    inviteStates.set(personId, "sending");

    try {
      let link = roomLink;
      if (personEmail) {
        const encryptedToken = await createInviteToken(room.id, personEmail, room.name);
        link = window.location.origin
          + "?room=" + encodeURIComponent(room.id)
          + "&invite=" + encodeURIComponent(encryptedToken);
      }
      const name = person.displayName || person.name || "there";
      const text =
        "Hey " + name + "! " + user.name + " invited you to a FileHive room.\n" +
        "This link is personal — it only works when you sign in as " + personEmail + "\n" +
        "Join here: " + link;
      await navigator.clipboard.writeText(text);
      inviteStates.set(personId, "copied");
      setTimeout(() => inviteStates.set(personId, "idle"), 3000);
    } catch {
      inviteStates.set(personId, "idle");
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(roomLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  }

  // ── Debounced search ─────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const found = await searchUsers(q);
      setResults(found);
    } finally {
      setSearching(false);
    }
  }, [searchUsers]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(searchTimer.current);
  }, [query, doSearch]);

  // ── Load teams on tab switch ──────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "teams" || teams.length > 0 || !user) return;
    setLoadingTeams(true);
    getMyTeams().then(t => { setTeams(t); setLoadingTeams(false); });
  }, [tab, user, teams.length, getMyTeams]);

  async function selectTeam(team) {
    setSelectedTeam(team);
    setTeamMembers([]);
    const members = await getTeamMembers(team.id);
    setTeamMembers(members);
  }


  return (
    <div className="teams-panel">
      <div className="tp-header">
        <div className="tp-header-left">
          <svg viewBox="0 0 23 23" width="18" height="18" fill="none" style={{ flexShrink: 0 }}>
            <rect x="1" y="1" width="10" height="10" fill="#F25022" />
            <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
            <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
            <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
          </svg>
          <h2 className="tp-title">Invite via Teams</h2>
        </div>
        <button className="tp-close" onClick={onClose}>✕</button>
      </div>

      {/* Signed-in user */}
      <div className="tp-user-bar">
        <div className="tp-avatar">{user.name[0].toUpperCase()}</div>
        <div className="tp-user-info">
          <span className="tp-user-name">{user.name}</span>
          <span className="tp-user-email">{user.email}</span>
        </div>
      </div>

      {/* How it works banner */}
      <div className="tp-how-it-works">
        <span className="tp-how-icon">💬</span>
        <span>Clicking <strong>Invite</strong> sends a direct Teams message with a join link. They click it and land straight in the room.</span>
      </div>

      {/* Room link */}
      <div className="tp-link-row">
        <div className="tp-link-box-inner">
          <span className="tp-link-label">Room link</span>
          <span className="tp-link-text">{roomLink}</span>
        </div>
        <button className={`btn btn-sm ${linkCopied ? "btn-ghost" : "btn-primary"}`} onClick={copyLink}>
          {linkCopied ? "✓ Copied" : "Copy"}
        </button>
      </div>

      {/* Tabs */}
      <div className="tp-tabs">
        <button className={`tp-tab ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}>
          Search people
        </button>
        <button className={`tp-tab ${tab === "teams" ? "active" : ""}`} onClick={() => setTab("teams")}>
          My teams
        </button>
      </div>

      {/* Search tab */}
      {tab === "search" && (
        <div className="tp-body">
          <div className="tp-search-wrap">
            <span className="tp-search-icon">🔍</span>
            <input
              className="tp-search"
              placeholder="Search by name or email…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {searching && <span className="tp-searching-dot" />}
          </div>
          <div className="tp-results">
            {query.length >= 2 && !searching && results.length === 0 && (
              <p className="tp-empty">No users found for "{query}"</p>
            )}
            {results.map(person => {
              const personId = person.id || person.userId;

              const status =
                inviteStatus[personId] ||
                (
                  room.members?.some(
                    member =>
                      member.id === personId &&
                      (
                        member.invitationStatus === "pending" ||
                        member.invitationStatus === "accepted"
                      )
                  )
                    ? "sent"
                    : "idle"
                );
              return (
                <PersonRow
                  key={personId}
                  person={person}
                  status={status}
                  onInvite={() => sendInvite(person)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Teams tab */}
      {tab === "teams" && (
        <div className="tp-body">
          {loadingTeams ? (
            <div className="tp-loading"><div className="spinner sm" /><span>Loading your teams…</span></div>
          ) : !selectedTeam ? (
            <div className="tp-team-list">
              {teams.length === 0 && <p className="tp-empty">No teams found.</p>}
              {teams.map(team => (
                <button key={team.id} className="tp-team-item" onClick={() => selectTeam(team)}>
                  <div className="tp-team-icon">🏢</div>
                  <div className="tp-team-name">{team.displayName}</div>
                  <span className="tp-chevron">→</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="tp-team-members">
              <button className="tp-back" onClick={() => { setSelectedTeam(null); setTeamMembers([]); }}>
                ← {selectedTeam.displayName}
              </button>
              {teamMembers.length === 0 && <div className="tp-loading"><div className="spinner sm" /></div>}
              {teamMembers.map(member => {
                const person = {
                  id: member.userId,
                  displayName: member.displayName,
                  mail: member.email,
                  jobTitle: member.jobTitle,
                };
                const personId = person.id || person.userId;

                const status =
                  inviteStatus[personId] ||
                  (
                    room.members?.some(
                      member =>
                        member.id === personId &&
                        (
                          member.invitationStatus === "pending" ||
                          member.invitationStatus === "accepted"
                        )
                    )
                      ? "sent"
                      : "idle"
                  );
                return (
                  <PersonRow
                    key={personId}
                    person={person}
                    status={status}
                    onInvite={() => sendInvite(person)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PersonRow({ person, status, onInvite }) {
  const initials = (person.displayName || person.name || "?")
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isSending = status === "sending";
  const isSent = status === "sent";

  return (
    <div className="tp-person">
      <div className="tp-person-avatar">
        {initials}
      </div>

      <div className="tp-person-info">
        <span className="tp-person-name">
          {person.displayName || person.name}
        </span>

        {(person.mail || person.userPrincipalName) && (
          <span className="tp-person-email">
            {person.mail || person.userPrincipalName}
          </span>
        )}
      </div>

      <button
        className={
          "btn btn-sm " +
          (isSent ? "btn-ghost btn-success" : "btn-primary")
        }
        onClick={onInvite}
        disabled={isSending || isSent}
      >
        {isSending ? (
          <span className="btn-mini-spinner" />
        ) : isSent ? (
          "✓ Sent"
        ) : (
          "Invite"
        )}
      </button>
    </div>
  );
}
