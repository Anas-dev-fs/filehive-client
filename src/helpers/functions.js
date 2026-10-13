import { BLOCKED_EXTENSIONS, BLOCKED_MIME_TYPES } from "./text";

const RECENT_ROOMS_KEY = (userId) => "filehive_recent_" + userId;
const MAX_PAST_MEMBERS_STORED = 5; // Keep past members from up to 5 recent rooms
const MAX_RECENT = 5;
const MAX_FAVOURITES = 3;

export const normalizeMember = (person, invitationStatus = "pending") => {
  return {
    id: person.id || person.userId,
    userId: person.userId || person.id,
    name: person.name || person.displayName || "Unknown",
    email: person.email || person.mail || person.userPrincipalName || "",
    invitationStatus: person.invitationStatus || invitationStatus,
    online: person.online ?? false,
  };
};

export const mergeRoomMembers = (room, invitedMembers = []) => {
  const existingMembers = Array.isArray(room.members) ? room.members : [];

  const normalizedInvited = invitedMembers
    .map((member) => normalizeMember(member, "pending"))
    .filter((member) => member.id);

  const memberMap = new Map();

  // Existing members first
  existingMembers.forEach((member) => {
    const id = member.id || member.userId;
    if (id) {
      memberMap.set(id, member);
    }
  });

  // Invited members
  normalizedInvited.forEach((member) => {
    const existing = memberMap.get(member.id);

    memberMap.set(member.id, {
      ...member,
      ...existing,
      // If the server says they're already a real member,
      // preserve that status.
      invitationStatus: existing?.invitationStatus || member.invitationStatus,
    });
  });

  return {
    ...room,
    members: Array.from(memberMap.values()),
    pastMembers: Array.from(
      new Map(
        [...(room.pastMembers || []), ...Array.from(memberMap.values())]
          .filter((member) => member.id)
          .map((member) => [member.id, member]),
      ).values(),
    ),
  };
};

// ── Recent rooms helpers ─────────────────────────────────────────────────────
export const loadRecentRooms = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_ROOMS_KEY(userId)) || "[]");
  } catch {
    return [];
  }
};

export const persistRecentRoom = (userId, room) => {
  const list = loadRecentRooms(userId);
  const existing = list.find((r) => r.id === room.id);

  const members = Array.from(
    new Map(
      [...(existing?.members || []), ...(room.members || [])]
        .filter((member) => member.id || member.userId)
        .map((member) => [member.id || member.userId, member]),
    ).values(),
  );

  const pastMembers = Array.from(
    new Map(
      [
        ...(existing?.pastMembers || []),
        ...(room.pastMembers || []),
        ...members,
      ]
        .filter((member) => member.id || member.userId)
        .map((member) => [member.id || member.userId, member]),
    ).values(),
  );

  const updatedRoom = {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt,
    members,
    pastMembers,
    favourite: existing?.favourite || room.favourite || false,

    ...(room.ended !== undefined ? { ended: room.ended } : {}),
  };

  const filtered = list.filter((r) => r.id !== room.id);

  const updated = [updatedRoom, ...filtered].slice(0, MAX_RECENT);

  localStorage.setItem(RECENT_ROOMS_KEY(userId), JSON.stringify(updated));

  console.log("💾 Saved recent room:", updatedRoom);
};

export const toggleFavouriteRoom = (userId, roomId) => {
  const list = loadRecentRooms(userId);
  const room = list.find((r) => r.id === roomId);

  if (!room) {
    return {
      blocked: false,
      rooms: list,
    };
  }

  if (room.favourite) {
    const updated = list.map((r) =>
      r.id === roomId ? { ...r, favourite: false } : r,
    );

    localStorage.setItem(RECENT_ROOMS_KEY(userId), JSON.stringify(updated));

    return {
      blocked: false,
      rooms: updated,
    };
  }

  const favouriteCount = list.filter((r) => r.favourite).length;

  if (favouriteCount >= MAX_FAVOURITES) {
    return {
      blocked: true,
      rooms: list,
    };
  }

  const updated = list.map((r) =>
    r.id === roomId ? { ...r, favourite: true } : r,
  );

  localStorage.setItem(RECENT_ROOMS_KEY(userId), JSON.stringify(updated));

  return {
    blocked: false,
    rooms: updated,
  };
};

export const deleteRecentRoom = (userId, roomId) => {
  const list = loadRecentRooms(userId);
  const updated = list.filter((r) => r.id !== roomId);
  localStorage.setItem(RECENT_ROOMS_KEY(userId), JSON.stringify(updated));
  return updated;
};

// Sort so favourites always appear first, preserving relative order within each group
export const sortRooms = (rooms) => {
  if (!Array.isArray(rooms)) {
    console.warn("sortRooms expected array, got:", rooms);
    return [];
  }

  const favs = rooms.filter((r) => r?.favourite);
  const rest = rooms.filter((r) => !r?.favourite);

  return [...favs, ...rest];
};

export const formatRelative = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
};

export const MsLogo = () => {
  return (
    <svg
      viewBox="0 0 23 23"
      width="10"
      height="10"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
};

export const formatBytes = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export const formatTime = (iso) => {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fileIcon = (type) => {
  if (!type) return "📄";
  if (type.startsWith("image/"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-image preview-icon"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    );
  if (type.startsWith("video/"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-file-video-camera preview-icon"
      >
        <path d="M4 12V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5" />
        <path d="m10 17.843 3.033-1.755a.64.64 0 0 1 .967.56v4.704a.65.65 0 0 1-.967.56L10 20.157" />
        <rect width="7" height="6" x="3" y="16" rx="1" />
      </svg>
    );
  if (type.startsWith("audio/"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-file-music preview-icon"
      >
        <path d="M11.65 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v10.35" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5" />
        <path d="M8 20v-7l3 1.474" />
        <circle cx="6" cy="20" r="2" />
      </svg>
    );
  if (type.includes("pdf"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-file-text preview-icon"
      >
        <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </svg>
    );
  if (
    type.includes("zip") ||
    type.includes("rar") ||
    type.includes("tar") ||
    type.includes("7z")
  )
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-file-archive preview-icon"
      >
        <path d="M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5" />
        <path d="M8 12v-1" />
        <path d="M8 18v-2" />
        <path d="M8 7V6" />
        <circle cx="8" cy="20" r="2" />
      </svg>
    );
  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type.includes("csv")
  )
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-file-spreadsheet preview-icon"
      >
        <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5" />
        <path d="M8 13h2" />
        <path d="M14 13h2" />
        <path d="M8 17h2" />
        <path d="M14 17h2" />
      </svg>
    );
  if (type.includes("word") || type.includes("document"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-file-type preview-icon"
      >
        <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5" />
        <path d="M11 18h2" />
        <path d="M12 12v6" />
        <path d="M9 13v-.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v.5" />
      </svg>
    );
  if (type.includes("presentation") || type.includes("powerpoint"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-file-chart-pie preview-icon"
      >
        <path d="M15.941 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.704l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v3.512" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5" />
        <path d="M4.017 11.512a6 6 0 1 0 8.466 8.475" />
        <path d="M9 16a1 1 0 0 1-1-1v-4c0-.552.45-1.008.995-.917a6 6 0 0 1 4.922 4.922c.091.544-.365.995-.917.995z" />
      </svg>
    );
  if (type.includes("text/plain"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-notebook-text preview-icon"
      >
        <path d="M2 6h4" />
        <path d="M2 10h4" />
        <path d="M2 14h4" />
        <path d="M2 18h4" />
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <path d="M9.5 8h5" />
        <path d="M9.5 12H16" />
        <path d="M9.5 16H14" />
      </svg>
    );
  if (
    type.includes("javascript") ||
    type.includes("json") ||
    type.includes("html") ||
    type.includes("css") ||
    type.includes("sql") ||
    type.includes("cshtml")
  )
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-file-braces-corner preview-icon"
      >
        <path d="M14 22h4a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v6" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5" />
        <path d="M5 14a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1 1 1 0 0 1 1 1v2a1 1 0 0 0 1 1" />
        <path d="M9 22a1 1 0 0 0 1-1v-2a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-2a1 1 0 0 0-1-1" />
      </svg>
    );
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-file preview-icon"
    >
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    </svg>
  );
};

export const isExecutableFile = (file) => {
  const fileName = file.name.toLowerCase();

  // Check the final extension
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";

  if (BLOCKED_EXTENSIONS.has(extension)) {
    return true;
  }

  // Check MIME type as an additional layer
  if (file.type && BLOCKED_MIME_TYPES.has(file.type.toLowerCase())) {
    return true;
  }

  return false;
};

// ── Upload queue reducer ──────────────────────────────────────────────────────
// Each item: { id, file, status: 'queued'|'uploading'|'done'|'error', progress, error }
export const queueReducer = (state, action) => {
  switch (action.type) {
    case "ENQUEUE":
      return [
        ...state,
        ...action.files.map((f) => ({
          id: Math.random().toString(36).slice(2),
          file: f,
          status: "queued",
          progress: 0,
          error: null,
        })),
      ];
    case "START":
      return state.map((item) =>
        item.id === action.id ? { ...item, status: "uploading" } : item,
      );
    case "PROGRESS":
      return state.map((item) =>
        item.id === action.id ? { ...item, progress: action.progress } : item,
      );
    case "DONE":
      return state.map((item) =>
        item.id === action.id
          ? { ...item, status: "done", progress: 100 }
          : item,
      );
    case "ERROR":
      return state.map((item) =>
        item.id === action.id
          ? { ...item, status: "error", error: action.error }
          : item,
      );
    case "CLEAR_DONE":
      return state.filter((item) => item.status !== "done");
    case "CANCEL":
      return state.filter((item) => item.id !== action.id);
    default:
      return state;
  }
};
