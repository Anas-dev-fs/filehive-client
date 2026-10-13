import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "../SocketContext";
import { useAuth } from "../AuthContext";
import { validateInviteToken, createInviteToken } from "../InviteToken";
import { useInviteStates } from "./TeamsPanel";
import Swal from "sweetalert2";
import {
  deleteRecentRoom,
  formatRelative,
  loadRecentRooms,
  mergeRoomMembers,
  MsLogo,
  normalizeMember,
  persistRecentRoom,
  sortRooms,
  toggleFavouriteRoom,
} from "../helpers/functions";
import LobbyActions from "./LobbyActions";
import CreateRoomLayout from "./CreateRoomLayout";
import JoinRoom from "./JoinRoom";

const API_BASE = process.env.REACT_APP_BACKEND_API_URL;

export default function Lobby({ onJoined }) {
  const { socket, connected } = useSocket();
  const {
    user,
    logout,
    getMyTeams,
    getMyChannels,
    sendTeamsInvite,
    sendChannelInvite,
    getTeamMembers,
    searchUsers,
  } = useAuth();

  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [roomName, setRoomName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [joiningViaInvite, setJoiningViaInvite] = useState(false);

  // Recent rooms
  const [recentRooms, setRecentRooms] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // Teams / channels for "recreate with same people"
  const [teams, setTeams] = useState([]);
  const [channels, setChannels] = useState({}); // teamId -> channel[]
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [reinviteState, setReinviteState] = useState({}); // roomId -> 'idle'|'sending'|'done'|'error'

  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const inviteStates = useInviteStates();

  const displayedMembers = memberSearch.trim() ? results : teamMembers;

  const inviteProcessed = useRef(false);

  // ── Load recent rooms from server on mount ──────────────────────────────────
  const hasFetched = useRef(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    if (hasFetched.current) return;
    hasFetched.current = true;

    const localList = loadRecentRooms(user.id);
    if (!localList.length) return;

    setRecentLoading(true);

    const ids = localList.map((r) => r.id).join(",");

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`${API_BASE}/api/rooms/recent?ids=${ids}`, {
      method: "GET",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed request");
        return res.json();
      })
      .then((data) => {
        const serverMap = {};
        (Array.isArray(data) ? data : []).forEach((r) => {
          serverMap[r.id] = r;
        });

        const merged = localList.map((local) => {
          const serverRoom = serverMap[local.id];

          if (!serverRoom) {
            return {
              ...local,
              ended: true,
            };
          }

          const mergedMembers = mergeRoomMembers(
            serverRoom,
            local.members || [],
          );

          return {
            ...local,
            ...serverRoom,
            members: mergedMembers.members,
            pastMembers: mergedMembers.pastMembers,
            favourite: local.favourite || false,
          };
        });

        setRecentRooms(sortRooms(merged));
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setRecentRooms(sortRooms(localList));
        }
      })
      .finally(() => {
        setRecentLoading(false);
      });

    return () => controller.abort();
  }, [user?.id]);

  // ── Load teams for channel panel ────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "create" || teams.length > 0 || !user) return;
    setLoadingTeams(true);
    getMyTeams().then((t) => {
      setTeams(t);
      setLoadingTeams(false);
    });
  }, [mode, user, teams.length, getMyTeams]);

  // ── Load channels when team is selected ────────────────────────────────────
  async function handleSelectTeam(teamId) {
    setSelectedTeamId(teamId);
    if (!channels[teamId]) {
      const ch = await getMyChannels(teamId);
      setChannels((prev) => ({ ...prev, [teamId]: ch }));
    }
  }

  // ── Invite processing ───────────────────────────────────────────────────────
  const processInvite = useCallback(async () => {
    const stored = sessionStorage.getItem("filehive_pending_invite");
    if (stored) {
      sessionStorage.removeItem("filehive_pending_invite");
      let parsed;
      try {
        parsed = JSON.parse(stored);
      } catch {
        setInviteError("Could not read invite data.");
        return;
      }
      const { roomId: invRoomId, inviteToken } = parsed;
      let result;
      try {
        result = await validateInviteToken(inviteToken, invRoomId, user.email);
      } catch {
        setInviteError("Could not validate invite link.");
        return;
      }
      if (!result.valid) {
        setInviteError(result.reason);
        return;
      }
      setJoiningViaInvite(true);
      socket.emit(
        "join_room",
        {
          roomId: invRoomId,
          userName: user.name,
          userId: user.id,
          userEmail: user.email,
        },
        (res) => {
          setJoiningViaInvite(false);
          if (res.success) {
            persistRecentRoom(user.id, res.room);
            onJoined({
              room: res.room,
              userId: res.userId,
              userName: user.name,
              isCreator: false,
            });
          } else {
            setInviteError(
              res.error || "Failed to join room — it may have ended.",
            );
          }
        },
      );
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const plainRoom = params.get("room");
    const inviteToken = params.get("invite");

    if (plainRoom) {
      if (inviteToken) {
        sessionStorage.setItem(
          "filehive_pending_invite",
          JSON.stringify({ roomId: plainRoom, inviteToken }),
        );
      }

      setRoomId(plainRoom.toUpperCase());
      setMode("join");
      window.history.replaceState({}, document.title, window.location.pathname);

      if (inviteToken && socket && connected) {
        setJoiningViaInvite(true);
        const result = await validateInviteToken(
          inviteToken,
          plainRoom,
          user.email,
        );
        if (!result.valid) {
          setJoiningViaInvite(false);
          setInviteError(result.reason);
          return;
        }
        sessionStorage.removeItem("filehive_pending_invite");
        socket.emit(
          "join_room",
          {
            roomId: plainRoom,
            userName: user.name,
            userId: user.id,
            userEmail: user.email,
          },
          (res) => {
            setJoiningViaInvite(false);
            if (res.success) {
              persistRecentRoom(user.id, res.room);
              onJoined({
                room: res.room,
                userId: res.userId,
                userName: user.name,
                isCreator: false,
              });
            } else {
              setInviteError(
                res.error || "Failed to join room — it may have ended.",
              );
            }
          },
        );
      }
    }
  }, [user, socket, connected, onJoined]);

  useEffect(() => {
    if (!user || !socket || !connected || inviteProcessed.current) return;
    inviteProcessed.current = true;
    processInvite();
  }, [user, socket, connected, processInvite]);

  // ── Create room ─────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    socket.emit(
      "create_room",
      {
        roomName: roomName.trim() || undefined,
        userName: user.name,
        userId: user.id,
        userEmail: user.email,

        invitedMembers: selectedMembers.map((person) => ({
          id: person.id || person.userId,
          name: person.name || person.displayName,
          email: person.email || person.mail || person.userPrincipalName || "",
        })),
      },
      async (res) => {
        if (!res.success) {
          setLoading(false);
          setError(res.error || "Failed to create room");
          return;
        }

        const invitedMembers = selectedMembers
          .map((person) => normalizeMember(person, "pending"))
          .filter((member) => member.id);

        console.log("👥 invitedMembers:", invitedMembers);
        console.log("🏠 res.room:", res.room);

        const createdRoom = mergeRoomMembers(res.room, invitedMembers);

        console.log("🏠 createdRoom BEFORE localStorage:", createdRoom);

        persistRecentRoom(user.id, createdRoom);

        if (selectedMembers.length > 0) {
          await Promise.all(
            selectedMembers.map((person) => sendInvite(person, createdRoom)),
          );
        }

        setLoading(false);

        onJoined({
          room: createdRoom,
          userId: res.userId,
          userName: user.name,
          isCreator: true,
        });
      },
    );
  }

  // ── Manual join ─────────────────────────────────────────────────────────────
  async function handleJoin(e) {
    e.preventDefault();
    if (!roomId.trim()) return setError("Enter a room code");
    setError("");
    const targetRoomId = roomId.trim().toUpperCase();
    const stored = sessionStorage.getItem("filehive_pending_invite");
    if (!stored)
      return setError("You need a valid invite link to join this room.");
    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch {
      return setError("Invalid invite data.");
    }
    if (parsed.roomId.toUpperCase() !== targetRoomId)
      return setError(
        "Your invite is for room " +
          parsed.roomId +
          ", not " +
          targetRoomId +
          ".",
      );
    setLoading(true);
    const result = await validateInviteToken(
      parsed.inviteToken,
      parsed.roomId,
      user.email,
    );
    if (!result.valid) {
      setLoading(false);
      return setError(result.reason);
    }
    sessionStorage.removeItem("filehive_pending_invite");
    socket.emit(
      "join_room",
      {
        roomId: parsed.roomId,
        userName: user.name,
        userId: user.id,
        userEmail: user.email,
      },
      (res) => {
        setLoading(false);
        if (res.success) {
          persistRecentRoom(user.id, res.room);
          onJoined({
            room: res.room,
            userId: res.userId,
            userName: user.name,
            isCreator: false,
          });
        } else {
          setError(res.error || "Failed to join room");
        }
      },
    );
  }

  // ── Recreate room and re-invite past members ────────────────────────────────
  async function handleRecreateRoom(recentRoom) {
    setReinviteState((s) => ({
      ...s,
      [recentRoom.id]: "sending",
    }));

    const oldMembers = [
      ...(recentRoom.members || []),
      ...(recentRoom.pastMembers || []),
    ];

    const uniqueMembers = Array.from(
      new Map(
        oldMembers
          .map((member) => {
            const memberId = member.id || member.userId;

            if (!memberId || memberId === user.id || !member.email) {
              return null;
            }

            return [
              memberId,
              {
                ...member,
                id: memberId,
              },
            ];
          })
          .filter(Boolean),
      ).values(),
    );

    const membersToReinvite = uniqueMembers.map((member) => ({
      ...normalizeMember(member, "pending"),
      invitationStatus: "pending",
      online: false,
    }));

    socket.emit(
      "create_room",
      {
        roomName: roomName.trim() || undefined,
        userName: user.name,
        userId: user.id,
        userEmail: user.email,

        // These are the members from the old room
        // that should be invited again.
        invitedMembers: membersToReinvite.map((person) => ({
          id: person.id || person.userId,
          name: person.name || person.displayName,
          email: person.email || person.mail || person.userPrincipalName || "",
        })),
      },

      async (res) => {
        if (!res?.success) {
          console.error("❌ Failed to recreate room:", res?.error);

          setReinviteState((s) => ({
            ...s,
            [recentRoom.id]: "error",
          }));

          return;
        }

        let newRoom = mergeRoomMembers(res.room, membersToReinvite);

        persistRecentRoom(user.id, newRoom);

        if (membersToReinvite.length === 0) {
          Swal.fire({
            icon: "info",
            title: "No invitations sent",
            text: "You were the only member in this room.",
            confirmButtonText: "OK",
          });
        } else {
          console.log(
            "📨 Sending invitations to",
            membersToReinvite.length,
            "people",
          );
        }

        let inviteSuccessCount = 0;

        await Promise.all(
          membersToReinvite.map(async (member) => {
            const memberId = member.id || member.userId;

            const memberEmail =
              member.email || member.mail || member.userPrincipalName || "";

            try {
              const result = await sendTeamsInvite(
                memberId,
                memberEmail,
                newRoom.id,
                newRoom.name,
              );

              if (result?.success) {
                inviteSuccessCount++;
              } else {
                console.error(
                  "❌ Failed to invite",
                  member.name,
                  ":",
                  result?.error,
                );
              }
            } catch (err) {
              console.error("❌ Failed to re-invite", member.name, err);
            }
          }),
        );

        const finalRoom = mergeRoomMembers(newRoom, membersToReinvite);

        persistRecentRoom(user.id, finalRoom);

        setReinviteState((s) => ({
          ...s,
          [recentRoom.id]: "done",
        }));

        onJoined({
          room: finalRoom,
          userId: res.userId,
          userName: user.name,
          isCreator: true,
        });
      },
    );
  }

  // ── Toggle favourite ────────────────────────────────────────────────────────
  function handleToggleFavourite(roomId) {
    const result = toggleFavouriteRoom(user.id, roomId);

    if (result.blocked) {
      Swal.fire({
        icon: "info",
        title: "Maximum favourites reached",
        text: "You can only have 3 favourite rooms. Unmark a favourite room before adding another.",
        confirmButtonText: "OK",
      });

      return;
    }

    setRecentRooms(sortRooms(result.rooms));
  }

  // ── Delete recent room ──────────────────────────────────────────────────────
  function handleDeleteRoom(roomId) {
    const updated = deleteRecentRoom(user.id, roomId);
    setRecentRooms(sortRooms(updated));
  }

  // ── Send channel invite ──────────────────────────────────────────────────────
  async function handleChannelInvite(teamId, channelId, channelName) {
    if (!mode) return;
    setLoading(true);
    socket.emit(
      "create_room",
      {
        roomName: roomName.trim() || undefined,
        userName: user.name,
        userId: user.id,
        userEmail: user.email,

        invitedMembers: selectedMembers.map((person) => ({
          id: person.id || person.userId,
          name: person.name || person.displayName,
          email: person.email || person.mail || person.userPrincipalName || "",
        })),
      },
      async (res) => {
        if (!res.success) {
          setLoading(false);
          setError("Failed to create room");
          return;
        }
        const newRoom = res.room;
        persistRecentRoom(user.id, newRoom);
        await sendChannelInvite(
          teamId,
          channelId,
          newRoom.id,
          newRoom.name,
          [],
        );
        setLoading(false);
        onJoined({
          room: newRoom,
          userId: res.userId,
          userName: user.name,
          isCreator: true,
        });
      },
    );
  }

  // ── My Room ────────────────────────────────────────────────────────────────
  async function handleMyRoom() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/rooms/my-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setLoading(false);
        setError("Failed to access your room");
        return;
      }
      const room = data.room;
      persistRecentRoom(user.id, room);

      socket.emit(
        "rejoin_room",
        {
          roomId: room.id,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
        },
        (joinRes) => {
          setLoading(false);
          if (!joinRes?.success) {
            if (joinRes?.kicked) {
              Swal.fire({
                icon: "warning",
                title: "Removed from room",
                text: "You have been removed from this room.",
                confirmButtonText: "OK",
              });

              return;
            }
          } else if (joinRes.success) {
            onJoined({
              room: joinRes.room,
              userId: user.id,
              userName: user.name,
              isCreator: user.id === room.creatorId,
            });
          } else {
            setError(joinRes.error || "Failed to join your room");
          }
        },
      );
    } catch (err) {
      setLoading(false);
      setError("Failed to connect to your room");
    }
  }

  const doSearch = useCallback(
    async (q) => {
      if (!q.trim() || q.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);

      try {
        const found = await searchUsers(q);
        setResults(found);
      } catch (error) {
        console.error("User search failed:", error);
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [searchUsers],
  );

  const toggleMember = (person) => {
    const personId = person.id || person.userId;

    setSelectedMembers((prev) => {
      const alreadySelected = prev.some(
        (member) => (member.id || member.userId) === personId,
      );

      if (alreadySelected) {
        return prev.filter(
          (member) => (member.id || member.userId) !== personId,
        );
      }

      return [...prev, person];
    });
  };

  async function sendInvite(person, createdRoom) {
    const personId = person.id || person.userId;

    const personEmail = person.mail || person.userPrincipalName || "";

    if (!personId || !personEmail) {
      await copyFallback(person);
      return;
    }

    inviteStates.set(personId, "sending");

    const result = await sendTeamsInvite(
      personId,
      personEmail,
      createdRoom.id,
      createdRoom.name,
    );

    if (result.success) {
      inviteStates.set(personId, "sent");

      setTimeout(() => {
        inviteStates.set(personId, "idle");
      }, 4000);
    } else {
      console.warn(
        "Teams invite failed:",
        result.error,
        "— falling back to clipboard",
      );

      await copyFallback(person);
    }
  }

  const memberSearchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        memberSearchRef.current &&
        !memberSearchRef.current.contains(event.target)
      ) {
        setMemberDropdownOpen(false);
        setMemberSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (memberSearch === "") {
      setMemberDropdownOpen(false);
    }
  }, [memberSearch]);

  const favouriteCount = recentRooms.filter((r) => r.favourite).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="lobby">
      <div className="lobby-hero">
        <div className="logo-mark">⬡</div>
        <h1 className="lobby-title">FileHive</h1>
        <p className="lobby-sub">Secure, real-time file sharing for teams</p>
      </div>

      <div className="lobby-user-chip">
        <div className="lobby-user-avatar">{user.name[0].toUpperCase()}</div>
        <div className="lobby-user-info">
          <span className="lobby-user-name">{user.name}</span>
          <span className="lobby-user-email">{user.email}</span>
        </div>
        <button className="lobby-signout-btn" onClick={logout}>
          Sign out
        </button>
      </div>

      {joiningViaInvite && (
        <div className="lobby-joining">
          <div className="spinner" />
          <span>Joining room via invite…</span>
        </div>
      )}

      {inviteError && (
        <div className="lobby-invite-error">
          <span>🔒</span>
          <div>
            <strong>Invite link rejected</strong>
            <span>{inviteError}</span>
          </div>
        </div>
      )}
      {inviteError && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: "12px" }}
          onClick={() => {
            setInviteError(null);
            setMode(null);
          }}
        >
          ← Back
        </button>
      )}

      {!joiningViaInvite && !inviteError && !mode && (
        <LobbyActions
          handleMyRoom={handleMyRoom}
          setMode={setMode}
          connected={connected}
          loading={loading}
        />
      )}

      {/* ── CREATE ROOM — two-column layout ── */}
      {mode === "create" && (
        <CreateRoomLayout
          handleCreate={handleCreate}
          roomName={roomName}
          setRoomName={setRoomName}
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          memberSearchRef={memberSearchRef}
          memberDropdownOpen={memberDropdownOpen}
          setMemberDropdownOpen={setMemberDropdownOpen}
          searching={searching}
          displayedMembers={displayedMembers}
          doSearch={doSearch}
          selectedMembers={selectedMembers}
          toggleMember={toggleMember}
          error={error}
          setError={setError}
          connected={connected}
          loading={loading}
          setMode={setMode}
          setSelectedTeamId={setSelectedTeamId}
          loadingTeams={loadingTeams}
          teams={teams}
          selectedTeamId={selectedTeamId}
          channels={channels}
          handleSelectTeam={handleSelectTeam}
          handleChannelInvite={handleChannelInvite}
          recentLoading={recentLoading}
          recentRooms={recentRooms}
          reinviteState={reinviteState}
          favouriteCount={favouriteCount}
          handleToggleFavourite={handleToggleFavourite}
          handleDeleteRoom={handleDeleteRoom}
          handleRecreateRoom={handleRecreateRoom}
          formatRelative={formatRelative}
        />
      )}

      {/* ── JOIN ROOM ── */}
      {mode === "join" && (
        <JoinRoom
          handleJoin={handleJoin}
          user={user}
          roomId={roomId}
          setRoomId={setRoomId}
          error={error}
          setError={setError}
          connected={connected}
          loading={loading}
          setMode={setMode}
          MsLogo={MsLogo}
        />
      )}

      {!connected && (
        <div className="status-pill status-off">● Connecting to server…</div>
      )}
      {connected && <div className="status-pill status-on">● Connected</div>}
    </div>
  );
}
