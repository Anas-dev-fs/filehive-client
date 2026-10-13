// Microsoft Entra ID (Azure AD) / MSAL configuration
//
// SETUP:
// 1. portal.azure.com -> Azure Active Directory -> App registrations -> New registration
//    Name: FileHive | Account type: Single tenant
// 2. Redirect URIs -> Single-page application (SPA):
//      http://localhost:3000
// 3. API permissions -> Microsoft Graph -> Delegated:
//      User.Read, User.ReadBasic.All, Team.ReadBasic.All, TeamMember.Read.All
//    Then "Grant admin consent"
// 4. Create client/.env:
//      REACT_APP_AZURE_CLIENT_ID=your-client-id
//      REACT_APP_AZURE_TENANT_ID=your-tenant-id
// 5. Restart dev server

export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID || "YOUR_CLIENT_ID",
    authority: "https://login.microsoftonline.com/" + (process.env.REACT_APP_AZURE_TENANT_ID || "YOUR_TENANT_ID"),
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: [
    "User.Read",
    "User.ReadBasic.All",
    "Team.ReadBasic.All",
    "TeamMember.Read.All",
    "Chat.Create",
    "ChatMessage.Send",
    // "ChannelMessage.Send",
  ],
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphUsersEndpoint: "https://graph.microsoft.com/v1.0/users",
  graphMyTeamsEndpoint: "https://graph.microsoft.com/v1.0/me/joinedTeams",
  graphTeamMembersEndpoint: (teamId) => "https://graph.microsoft.com/v1.0/teams/" + teamId + "/members",
  graphTeamChannelsEndpoint: (teamId) => "https://graph.microsoft.com/v1.0/teams/" + teamId + "/channels",
  // graphChannelMessageEndpoint: (teamId, channelId) => "https://graph.microsoft.com/v1.0/teams/" + teamId + "/channels/" + channelId + "/messages",
};

export const isMsalConfigured = () =>
  process.env.REACT_APP_AZURE_CLIENT_ID &&
  process.env.REACT_APP_AZURE_CLIENT_ID !== "YOUR_CLIENT_ID" &&
  process.env.REACT_APP_AZURE_TENANT_ID &&
  process.env.REACT_APP_AZURE_TENANT_ID !== "YOUR_TENANT_ID";