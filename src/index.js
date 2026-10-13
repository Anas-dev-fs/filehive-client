import React from "react";
import ReactDOM from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, isMsalConfigured } from "./msalConfig";
import App from "./App";

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then((registration) => {
      console.log("Service Worker registered:", registration);
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}

// The instance MUST be created here, outside React, before anything renders.
// MsalProvider takes it as a prop and calls initialize() + handleRedirectPromise() itself.
// Never call these methods yourself — that's what causes timed_out and other errors.
let msalInstance = null;
if (isMsalConfigured()) {
  msalInstance = new PublicClientApplication(msalConfig);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App msalInstance={msalInstance} />);
