import { useAuth } from "../AuthContext";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { login, configured } = useAuth();
  const { inProgress } = useMsal();
  const [redirectError, setRedirectError] = useState(null);
  const [hasInvite, setHasInvite] = useState(false);

  // Only show the spinner when MSAL is actively in the middle of a login redirect.
  // Startup = MSAL initialising (not a user action) — don't show spinner.
  // We no longer use logoutRedirect so there's no logout redirect returning here.
  const loggingIn = inProgress === InteractionStatus.Login ||
    inProgress === InteractionStatus.HandleRedirect;

  useEffect(() => {
    // Catch errors Microsoft sends back in the URL hash after a failed redirect
    const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));
    const msError = hashParams.get("error");
    if (msError) {
      setRedirectError(hashParams.get("error_description") || msError);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Check for encrypted invite token in query string
    const searchParams = new URLSearchParams(window.location.search);
    const roomId = searchParams.get("room");
    const inviteToken = searchParams.get("invite");

    if (roomId && inviteToken) {
      // Store for Lobby to consume after sign-in completes
      sessionStorage.setItem("filehive_pending_invite", JSON.stringify({ roomId, inviteToken }));
      setHasInvite(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="login-shell">
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-grid" />
        <div className="login-bg-glow" />
      </div>

      <div className="login-card">
        <div className="login-logo">
          <div className="login-hex">⬡</div>
          <h1 className="login-brand">FileHive</h1>
        </div>

        {hasInvite && (
          <div className="login-invite-banner">
            <span className="lib-icon">📨</span>
            <div className="lib-body">
              <strong>You've been invited to a room</strong>
              <span>Sign in with the Microsoft account that received this invite to join automatically.</span>
            </div>
          </div>
        )}

        {!hasInvite && (
          <p className="login-tagline">
            Real-time file sharing for your team.<br />
            Sign in with your Microsoft account to continue.
          </p>
        )}

        {configured ? (
          <div className="login-auth">
            <button className="btn-ms-primary" onClick={login} disabled={loggingIn}>
              {loggingIn ? (
                <><div className="btn-spinner" />Redirecting to Microsoft…</>
              ) : (
                <><MicrosoftLogo />{hasInvite ? "Sign in to join room" : "Continue with Microsoft"}</>
              )}
            </button>

            {redirectError && (
              <div className="login-error">
                <span className="login-error-icon">⚠</span>
                {redirectError}
              </div>
            )}

            <p className="login-note">
              {hasInvite
                ? "Sign in with the email address this invite was sent to. The link is encrypted and only works for that account."
                : "You'll be redirected to Microsoft to sign in. Your Teams groups and colleagues will be available inside the app."
              }
            </p>
          </div>
        ) : (
          <div className="login-unconfigured">
            <div className="login-unconfigured-icon">🔧</div>
            <h3>Azure AD not configured</h3>
            <p>Add your Microsoft Entra ID credentials to <code>client/.env</code> to enable sign-in.</p>
            <div className="setup-steps">
              <SetupStep n="1">Go to <strong>portal.azure.com</strong> → Azure Active Directory → App registrations → <strong>New registration</strong></SetupStep>
              <SetupStep n="2">Set name to <code>FileHive</code>, account type <em>Single tenant</em>, redirect URI <code>YOUR_REDIRECT_URL</code> as <strong>Single-page application (SPA)</strong></SetupStep>
              <SetupStep n="3">Add Delegated Graph permissions: <code>User.Read</code> · <code>User.ReadBasic.All</code> · <code>Team.ReadBasic.All</code> · <code>TeamMember.Read.All</code> · <code>Chat.Create</code> · <code>ChatMessage.Send</code> — then <strong>Grant admin consent</strong></SetupStep>
              <SetupStep n="4">Create <code>client/.env</code>:<div className="env-block"><code>REACT_APP_AZURE_CLIENT_ID=your-client-id</code><code>REACT_APP_AZURE_TENANT_ID=your-tenant-id</code></div></SetupStep>
              <SetupStep n="5">Restart: <code>npm start</code> in the client folder</SetupStep>
            </div>
          </div>
        )}
      </div>

      <p className="login-footer">FileHive · Internal team tool · Powered by Microsoft Graph</p>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 23 23" width="20" height="20" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function SetupStep({ n, children }) {
  return (
    <div className="setup-step">
      <div className="setup-step-n">{n}</div>
      <div className="setup-step-body">{children}</div>
    </div>
  );
}