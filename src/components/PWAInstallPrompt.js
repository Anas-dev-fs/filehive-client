import { useState, useEffect } from "react";
import "./PWAInstallPrompt.css";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="pwa-install-overlay">
      <div className="pwa-install-prompt">
        <button className="pwa-close-btn" onClick={handleDismiss}>×</button>
        <div className="pwa-icon">⬡</div>
        <h3>Install FileHive</h3>
        <p>Install FileHive on your device for quick access and a better experience.</p>
        <div className="pwa-actions">
          <button className="pwa-dismiss-btn" onClick={handleDismiss}>
            Not now
          </button>
          <button className="pwa-install-btn" onClick={handleInstallClick}>
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
