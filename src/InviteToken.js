// ─── Invite Token: AES-GCM encryption via Web Crypto API ─────────────────────
//
// Token payload: { roomId, email, roomName, expiry (unix ms) }
// Key derivation: PBKDF2 from (roomId + APP_SALT) — no server needed
// The token is URL-safe base64. Anyone without the correct email is rejected
// even if they get hold of the link.
//
// APP_SALT: a fixed per-deployment secret baked into the build.
// Change this value when you deploy to production.
const APP_SALT = process.env.REACT_APP_INVITE_SALT || "filehive-invite-salt-v1";

// Invite links expire after 48 hours
const EXPIRY_MS = 48 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function str2buf(str) {
    return new TextEncoder().encode(str);
}

function buf2b64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b642buf(b64) {
    const s = b64.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(s);
    return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
}

// Derive a 256-bit AES-GCM key from roomId using PBKDF2
async function deriveKey(roomId) {
    const raw = await crypto.subtle.importKey(
        "raw", str2buf(roomId + APP_SALT), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: str2buf(APP_SALT), iterations: 100000, hash: "SHA-256" },
        raw,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create an encrypted invite token for a specific email + room.
 * Returns a URL-safe base64 string: iv(12) + ciphertext
 */
export async function createInviteToken(roomId, recipientEmail, roomName) {
    const payload = JSON.stringify({
        roomId,
        email: recipientEmail.toLowerCase().trim(),
        roomName: roomName || roomId,
        expiry: Date.now() + EXPIRY_MS,
    });

    const key = await deriveKey(roomId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        str2buf(payload)
    );

    // Prepend IV to ciphertext so we can extract it on decrypt
    const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipher), iv.byteLength);

    return buf2b64(combined.buffer);
}

/**
 * Decrypt and validate an invite token.
 * Returns { valid: true, roomId, email, roomName } or { valid: false, reason }
 *
 * @param {string} token   - The encrypted token from the URL
 * @param {string} roomId  - The roomId claim (used as decryption key seed)
 * @param {string} userEmail - The currently signed-in user's email
 */
export async function validateInviteToken(token, roomId, userEmail) {
    try {
        const combined = b642buf(token);
        const iv = combined.slice(0, 12);
        const cipher = combined.slice(12);

        const key = await deriveKey(roomId);
        let plainBuf;
        try {
            plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, cipher);
        } catch {
            return { valid: false, reason: "Invalid or tampered invite link." };
        }

        const payload = JSON.parse(new TextDecoder().decode(plainBuf));

        // Expiry check
        if (Date.now() > payload.expiry) {
            return { valid: false, reason: "This invite link has expired (48h limit)." };
        }

        // Room ID check
        if (payload.roomId !== roomId) {
            return { valid: false, reason: "Invite link does not match this room." };
        }

        // Email check — the signed-in user must be the intended recipient
        if (payload.email !== userEmail.toLowerCase().trim()) {
            return {
                valid: false,
                reason: "This invite was not sent to the logged in email.",
            };
        }

        return { valid: true, roomId: payload.roomId, email: payload.email, roomName: payload.roomName };
    } catch (err) {
        console.error("validateInviteToken error:", err);
        return { valid: false, reason: "Could not read invite link." };
    }
}