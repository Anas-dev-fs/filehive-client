// resumableUpload.js  (parallel chunks)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitOnline = () =>
  navigator.onLine
    ? Promise.resolve()
    : new Promise((r) => window.addEventListener("online", r, { once: true }));

// Refresh ke baad resume ke liye same file ka same uploadId
function getStableUploadId(roomId, file) {
  const key = `upload:${roomId}:${file.name}:${file.size}:${file.lastModified}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return { id, key };
}

// Ek chunk ki PUT request. Chunk ki pehchan uska byte offset hai.
function putChunk({ url, blob, offset, signal, onBytes }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("X-Upload-Offset", String(offset));

    xhr.upload.onprogress = (e) => e.lengthComputable && onBytes?.(e.loaded);
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error("network error"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    if (signal) {
      if (signal.aborted) return xhr.abort();
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(blob);
  });
}

// ── Protocol ke hisab se concurrency ─────────────────────────────────────────
// http/1.1: browser ek host par 6 connections hi deta hai, isse zyada queue mein khade rehte hain.
// h2/h3: sab requests ek connection par multiplex hoti hain, 6 ki hadd nahi.
//        Zyada number se speed linearly nahi barhti, is liye 8 se shuru karo aur naap kar tune karo.
const CONCURRENCY_BY_PROTOCOL = { "http/1.1": 6, h2: 8, h3: 8 };
const FALLBACK_CONCURRENCY = 6;

// Chunk requests ki wajah se Resource Timing buffer (default 250) bhar sakta hai
try {
  performance.setResourceTimingBufferSize(1000);
} catch {}

const protocolCache = new Map(); // origin -> protocol

function detectProtocol(url) {
  const origin = new URL(url, window.location.href).origin;
  if (protocolCache.has(origin)) return protocolCache.get(origin);

  const entries = performance
    .getEntriesByName(url)
    .filter((e) => e.entryType === "resource");
  const proto = entries.length
    ? entries[entries.length - 1].nextHopProtocol
    : "";

  if (proto) protocolCache.set(origin, proto); // sirf tab cache karo jab pata chala ho
  return proto;
}

export async function uploadFileResumable({
  apiBase, // e.g. "https://your-server.com"
  roomId,
  file,
  uploaderId,
  uploaderName,
  onProgress, // ({ percent, uploaded, total }) => void
  signal, // AbortController.signal (user cancel)
  concurrency, // optional: na do to protocol (http/1.1, h2, h3) ke hisab se auto set hoga
  maxRetries = 8,
}) {
  const base = `${apiBase}/api/rooms/${roomId}/uploads`;
  const { id: stableId, key: storageKey } = getStableUploadId(roomId, file);
  let uploadId = stableId;

  const json = async (res) => {
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  };

  const init = async () => {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        uploaderId,
        uploaderName,
      }),
      signal,
    });
    const { status, body } = await json(res);
    if (status !== 200 && status !== 201) {
      throw new Error(body.error || `init failed (${status})`);
    }
    return body;
  };

  const getStatus = async () => {
    const res = await fetch(`${base}/${uploadId}`, { signal });
    return json(res);
  };

  // ── Session shuru / resume ────────────────────────────────────────────────
  const state = await init();

  // Server ne agar alag id di ho to wahi use karo
  uploadId = state.uploadId;
  localStorage.setItem(storageKey, uploadId);

  if (state.complete) {
    localStorage.removeItem(storageKey);
    return state.file;
  }

  const proto = detectProtocol(base);
  const limit =
    concurrency ?? CONCURRENCY_BY_PROTOCOL[proto] ?? FALLBACK_CONCURRENCY;
  console.log(
    `[upload] protocol=${proto || "unknown"}, concurrency=${limit}` +
      (concurrency ? " (manual)" : ""),
  );

  const { chunkSize, totalChunks } = state;
  const done = new Set(state.received || []); // server pe confirm ho chuke chunks
  const inflight = new Map(); // chunkIndex -> bytes bheji ja chuki (chunk ke andar)

  const chunkLen = (i) => Math.min(chunkSize, file.size - i * chunkSize);

  let doneBytes = 0;
  for (const i of done) doneBytes += chunkLen(i);

  const report = () => {
    let uploaded = doneBytes;
    for (const loaded of inflight.values()) uploaded += loaded;
    uploaded = Math.min(uploaded, file.size);
    onProgress?.({
      uploaded,
      total: file.size,
      percent: Math.min(100, Math.floor((uploaded / file.size) * 100)),
    });
  };
  report();

  // Internal controller: ek chunk permanently fail ho to baaki workers bhi ruk jayen
  const ctrl = new AbortController();
  const onOuterAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", onOuterAbort, { once: true });
  }

  let finalState = null;
  let firstError = null;

  const sendChunk = async (i) => {
    const offset = i * chunkSize;
    const blob = file.slice(offset, offset + chunkLen(i));
    let attempt = 0;

    for (;;) {
      await waitOnline();
      const t0 = performance.now();

      try {
        const { status, body } = await putChunk({
          url: `${base}/${uploadId}`,
          blob,
          offset,
          signal: ctrl.signal,
          onBytes: (loaded) => {
            inflight.set(i, loaded);
            report();
          },
        });
        inflight.delete(i);

        if (status === 200) {
          if (!done.has(i)) {
            done.add(i);
            doneBytes += blob.size;
          }
          if (body?.complete) finalState = body;
          report();

          const secs = (performance.now() - t0) / 1000;
          console.log(
            `[upload] chunk ${i + 1}/${totalChunks} ${(blob.size / 1048576).toFixed(2)} MB ` +
              `in ${secs.toFixed(1)}s = ${(blob.size / 1024 / secs).toFixed(0)} KB/s`,
          );
          return;
        }

        if (status === 404 || status === 413) {
          if (status === 404) localStorage.removeItem(storageKey);
          const e = new Error(
            status === 404
              ? "Upload session not found (room may have ended)"
              : body?.error || "Chunk too large",
          );
          e.fatal = true;
          throw e;
        }

        throw new Error(body?.error || `chunk failed (${status})`);
      } catch (err) {
        inflight.delete(i);
        report();
        if (err.name === "AbortError" || err.fatal) throw err;

        attempt += 1;
        console.warn(
          `[upload] chunk ${i + 1}/${totalChunks} failed: ${err.message} ` +
            `(attempt ${attempt}/${maxRetries}, online=${navigator.onLine})`,
        );
        if (attempt > maxRetries) throw err;

        await sleep(Math.min(1000 * 2 ** (attempt - 1), 15000));
      }
    }
  };

  // Jo chunks abhi server pe nahi hain, wahi bhejne hain
  const pending = [];
  for (let i = 0; i < totalChunks; i++) if (!done.has(i)) pending.push(i);

  const worker = async () => {
    while (!ctrl.signal.aborted) {
      const i = pending.shift();
      if (i === undefined) return;
      await sendChunk(i);
    }
  };

  try {
    const workerCount = Math.max(1, Math.min(limit, pending.length));
    const workers = Array.from({ length: workerCount }, () =>
      worker().catch((err) => {
        if (err.name !== "AbortError" && !firstError) firstError = err;
        ctrl.abort(); // baaki workers rok do
      }),
    );
    await Promise.all(workers);

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (firstError) throw firstError;

    // Aakhri chunk ke response mein file aa jati hai, warna status se pooch lo
    let result = finalState;
    for (let k = 0; !result?.complete && k < 6; k++) {
      if (k) await sleep(700);
      const s = await getStatus();
      if (s.status === 404) throw new Error("Upload session not found");
      if (s.status === 200 && s.body.complete) result = s.body;
    }
    if (!result?.complete) {
      throw new Error("Upload finished but the server could not finalize it");
    }

    localStorage.removeItem(storageKey);
    onProgress?.({ uploaded: file.size, total: file.size, percent: 100 });
    return result.file;
  } catch (err) {
    if (signal?.aborted || err.name === "AbortError") {
      // User ne cancel kiya: server se temp file bhi hata do
      localStorage.removeItem(storageKey);
      fetch(`${base}/${uploadId}`, { method: "DELETE", keepalive: true }).catch(
        () => {},
      );
      throw new DOMException("Aborted", "AbortError");
    }
    throw err; // network/server error: session rehne do taake dobara try par resume ho
  } finally {
    signal?.removeEventListener("abort", onOuterAbort);
  }
}
