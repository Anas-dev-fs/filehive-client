import { createContext, useContext, useCallback } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest, graphConfig, isMsalConfigured } from "./msalConfig";
import { createInviteToken } from "./InviteToken";

// This context only adds Graph API helpers on top of msal-react.
// All auth state (accounts, inProgress) comes from useMsal() directly.
const GraphContext = createContext(null);

async function callGraph(url, token) {
  const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) throw new Error("Graph error " + res.status + ": " + await res.text());
  return res.json();
}

export function AuthProvider({ children }) {
  return (
    <GraphContext.Provider value={{}}>
      {children}
    </GraphContext.Provider>
  );
}

// The one hook everything uses for auth + Graph
export function useAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const configured = isMsalConfigured();

  // Derive authState from msal-react's own inProgress + accounts
  let authState;
  if (!configured) {
    authState = "unconfigured";
  } else if (inProgress === InteractionStatus.Startup) {
    authState = "initializing";
  } else if (isAuthenticated && accounts.length > 0) {
    authState = "authenticated";
  } else {
    authState = "unauthenticated";
  }

  const account = accounts[0] || null;

  // Build user object from the MSAL account (no Graph call needed for basic info)
  const user = account ? {
    id: account.localAccountId,
    name: account.name,
    email: account.username,
    account,
  } : null;

  // Login — always show account picker, use redirect (no popups, no timed_out)
  const login = useCallback(async () => {
    if (inProgress !== InteractionStatus.None) return;
    try {
      await instance.loginRedirect({
        ...loginRequest,
        prompt: "select_account",
      });
    } catch (err) {
      console.error("loginRedirect error:", err);
    }
  }, [instance, inProgress]);

  // Logout — clears MSAL cache locally then hard-reloads to origin
  // No logoutRedirect needed; clearCache() removes all tokens from localStorage.
  // Hard reload forces MsalProvider to re-initialise with empty cache → unauthenticated state.
  const logout = useCallback(async () => {
    if (!account) return;
    try {
      await instance.clearCache();
      instance.setActiveAccount(null);
    } catch (err) {
      console.error("logout error:", err);
    }
    // Replace so back-button doesn't re-enter the app in a broken half-authed state
    window.location.replace(window.location.origin);
  }, [instance, account]);

  // Get an access token silently (uses msal-react's instance)
  const getToken = useCallback(async () => {
    if (!account) return null;
    try {
      const result = await instance.acquireTokenSilent({ ...loginRequest, account });
      return result.accessToken;
    } catch (err) {
      // Token expired — redirect to re-authenticate
      await instance.acquireTokenRedirect({ ...loginRequest, account });
      return null;
    }
  }, [instance, account]);

  // Graph: send a real Teams 1:1 chat invite to a specific user
  // The link is encrypted with AES-GCM — only the intended recipient's email can unlock it.
  const sendTeamsInvite = useCallback(async (recipientUserId, recipientEmail, roomId, roomName) => {
    const token = await getToken();
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      // Build encrypted invite link — encodes roomId + recipientEmail + expiry
      const encryptedToken = await createInviteToken(roomId, recipientEmail, roomName);
      const inviteLink = window.location.origin
        + "?room=" + encodeURIComponent(roomId)
        + "&invite=" + encodeURIComponent(encryptedToken);

      // Create (or fetch existing) 1:1 chat
      const chatRes = await fetch("https://graph.microsoft.com/v1.0/chats", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          chatType: "oneOnOne",
          members: [
            {
              "@odata.type": "#microsoft.graph.aadUserConversationMember",
              roles: ["owner"],
              "user@odata.bind": "https://graph.microsoft.com/v1.0/users('" + user.id + "')",
            },
            {
              "@odata.type": "#microsoft.graph.aadUserConversationMember",
              roles: ["owner"],
              "user@odata.bind": "https://graph.microsoft.com/v1.0/users('" + recipientUserId + "')",
            },
          ],
        }),
      });
      if (!chatRes.ok) {
        const err = await chatRes.json();
        throw new Error(err?.error?.message || "Failed to create chat");
      }
      const chat = await chatRes.json();

      const displayRoom = roomName || roomId;
      const msgRes = await fetch("https://graph.microsoft.com/v1.0/chats/" + chat.id + "/messages", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          body: {
            contentType: "html",
            content:
              "<p><b>" + user.name + "</b> invited you to a FileHive room.</p>" +
              "<p><b>Room:</b> " + displayRoom + "</p>" +
              "<p>This link is personal — it only works when you're signed in as <b>" + recipientEmail + "</b>.</p>" +
              "<p><a href=\"" + inviteLink + "\">👉 Click here to join</a></p>",
          },
        }),
      });
      if (!msgRes.ok) {
        const err = await msgRes.json();
        throw new Error(err?.error?.message || "Failed to send message");
      }
      return { success: true };
    } catch (err) {
      console.error("sendTeamsInvite error:", err);
      return { success: false, error: err.message };
    }
  }, [getToken, user]);

  // Graph: search org users
  const searchUsers = useCallback(async (query) => {
    if (!query.trim()) return [];
    const token = await getToken();
    if (!token) return [];
    try {
      const encoded = encodeURIComponent(query);
      const url = graphConfig.graphUsersEndpoint
        + "?$filter=startswith(displayName,'" + encoded + "') or startswith(mail,'" + encoded + "')"
        + "&$select=id,displayName,mail,jobTitle,userPrincipalName&$top=20";
      const data = await callGraph(url, token);
      return (data.value || []).filter(u => u.id !== user?.id);
    } catch (err) {
      console.error("searchUsers error:", err);
      return [];
    }
  }, [getToken, user]);

  // Graph: get teams the user belongs to
  const getMyTeams = useCallback(async () => {
    const token = await getToken();
    if (!token) return [];
    try {
      const data = await callGraph(graphConfig.graphMyTeamsEndpoint, token);
      return data.value || [];
    } catch (err) {
      console.error("getMyTeams error:", err);
      return [];
    }
  }, [getToken]);

  // Graph: get channels of a specific team
  const getMyChannels = useCallback(async (teamId) => {
    const token = await getToken();
    if (!token) return [];
    try {
      const data = await callGraph(graphConfig.graphTeamChannelsEndpoint(teamId), token);
      return data.value || [];
    } catch (err) {
      console.error("getMyChannels error:", err);
      return [];
    }
  }, [getToken]);

  // Graph: post an invite message to a Teams channel
  const sendChannelInvite = useCallback(async (teamId, channelId, roomId, roomName, memberEmails) => {
    const token = await getToken();
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      // Build a single invite link without email encryption for channel posts
      // (channel messages are visible to all channel members already)
      const inviteLink = window.location.origin + "?room=" + encodeURIComponent(roomId);
      const memberList = memberEmails && memberEmails.length
        ? "<p>Invited: " + memberEmails.join(", ") + "</p>" : "";

      const msgRes = await fetch(graphConfig.graphChannelMessageEndpoint(teamId, channelId), {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          body: {
            contentType: "html",
            content:
              "<p><b>" + user.name + "</b> started a FileHive file-sharing room.</p>" +
              "<p><b>Room:</b> " + (roomName || roomId) + "</p>" +
              memberList +
              "<p><a href=\"" + inviteLink + "\">👉 Click here to join</a></p>",
          },
        }),
      });
      if (!msgRes.ok) {
        const err = await msgRes.json();
        throw new Error(err?.error?.message || "Failed to post to channel");
      }
      return { success: true };
    } catch (err) {
      console.error("sendChannelInvite error:", err);
      return { success: false, error: err.message };
    }
  }, [getToken, user]);

  // Graph: get members of a specific team
  const getTeamMembers = useCallback(async (teamId) => {
    const token = await getToken();
    if (!token) return [];
    try {
      const data = await callGraph(graphConfig.graphTeamMembersEndpoint(teamId), token);
      return (data.value || []).filter(m => m.userId !== user?.id);
    } catch (err) {
      console.error("getTeamMembers error:", err);
      return [];
    }
  }, [getToken, user]);

  return {
    authState,
    user,
    configured,
    loggingIn: inProgress !== InteractionStatus.None && inProgress !== InteractionStatus.Startup,
    loginError: null,
    login,
    logout,
    searchUsers,
    getMyTeams,
    getTeamMembers,
    getMyChannels,
    sendTeamsInvite,
    sendChannelInvite,
  };
}