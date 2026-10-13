import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import { vscodeDark } from "@uiw/codemirror-theme-vscode";

import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";

import { EditorState } from "@codemirror/state";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";

import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  foldAll,
  unfoldAll,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";

import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";

import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { markdown } from "@codemirror/lang-markdown";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { php } from "@codemirror/lang-php";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

export default function FilePreviewModal({ file, url, onClose }) {
  // -------------------------------------------------------
  // STATE + REFS  (all hooks live above the `if (!file)` return)
  // -------------------------------------------------------

  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [textContent, setTextContent] = useState("");
  const [copied, setCopied] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const editorRef = useRef(null);
  const editorViewRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, originX: 0, originY: 0 });

  /*
   * IMPORTANT:
   * `url` MUST be the /preview URL from the parent component.
   *
   * Example:
   * /api/rooms/:roomId/files/:fileId/preview
   *
   * Do NOT pass the /download URL here.
   */

  const fileUrl = url;
  const fileType = (file?.fileType || "").toLowerCase();
  const fileName = file?.fileName || "File";

  const extension = useMemo(() => {
    const name = fileName.toLowerCase();

    if (!name.includes(".")) {
      return "";
    }

    return name.split(".").pop();
  }, [fileName]);

  // -------------------------------------------------------
  // FILE TYPE DETECTION
  // -------------------------------------------------------

  const isImage =
    fileType.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|tiff|tif)$/i.test(fileName);

  const isPdf = fileType === "application/pdf" || /\.pdf$/i.test(fileName);

  const isVideo =
    fileType.startsWith("video/") ||
    /\.(mp4|webm|ogg|mov|avi|mkv|m4v)$/i.test(fileName);

  const isAudio =
    fileType.startsWith("audio/") ||
    /\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(fileName);

  const isText =
    fileType.startsWith("text/") ||
    /\.(txt|csv|tsv|json|xml|js|jsx|ts|tsx|css|scss|sass|less|html|htm|md|markdown|yml|yaml|ini|conf|log|sql|graphql|sh|bat|cmd|py|java|c|cpp|h|hpp|cs|php|rb|go|rs|swift|kt|dart)$/i.test(
      fileName,
    );

  const isDocx =
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx";

  const isOldWord = fileType === "application/msword" || extension === "doc";

  const isExcel =
    fileType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileType === "application/vnd.ms-excel" ||
    /\.(xlsx|xls)$/i.test(fileName);

  const isPowerPoint =
    fileType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileType === "application/vnd.ms-powerpoint" ||
    /\.(pptx|ppt)$/i.test(fileName);

  const isArchive = /\.(zip|rar|7z|tar|gz|tgz|bz2)$/i.test(fileName);

  const isFont = /\.(ttf|otf|woff|woff2|eot)$/i.test(fileName);

  const isBinary = /\.(bin|dat|db|sqlite|sqlite3|iso|img)$/i.test(fileName);

  // -------------------------------------------------------
  // TEXT FILE PREVIEW (fetch)
  // -------------------------------------------------------

  useEffect(() => {
    if (!isText || !fileUrl) return;

    let cancelled = false;

    const loadText = async () => {
      try {
        setLoading(true);
        setPreviewError("");
        setTextContent("");

        const response = await fetch(fileUrl);

        if (!response.ok) {
          throw new Error("Unable to load file.");
        }

        const text = await response.text();

        if (!cancelled) {
          setTextContent(text);
        }
      } catch (error) {
        console.error("Text preview error:", error);

        if (!cancelled) {
          setPreviewError("Unable to preview this file.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadText();

    return () => {
      cancelled = true;
    };
  }, [file?.id, isText, fileUrl]);

  // -------------------------------------------------------
  // CODEMIRROR EDITOR
  // -------------------------------------------------------

  useEffect(() => {
    if (!isText || loading || previewError || !editorRef.current) {
      return;
    }

    const getLanguageExtension = () => {
      switch (extension) {
        case "js":
        case "jsx":
        case "ts":
        case "tsx":
          return javascript({
            jsx: true,
            typescript: extension === "ts" || extension === "tsx",
          });

        case "json":
          return json();

        case "py":
          return python();

        case "css":
        case "scss":
        case "sass":
        case "less":
          return css();

        case "html":
        case "htm":
          return html();

        case "xml":
          return xml();

        case "sql":
          return sql();

        case "md":
        case "markdown":
          return markdown();

        case "java":
          return java();

        case "c":
        case "cpp":
        case "h":
        case "hpp":
          return cpp();

        case "php":
          return php();

        default:
          return [];
      }
    };

    const state = EditorState.create({
      doc: textContent,
      extensions: [
        lineNumbers(),
        foldGutter(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        bracketMatching(),
        indentOnInput(),
        history(),
        drawSelection(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        vscodeDark,
        getLanguageExtension(),

        // Long lines wrap instead of running off-screen
        EditorView.lineWrapping,

        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap, // Ctrl+Shift+[ / ] to fold/unfold
          ...searchKeymap, // Ctrl+F
        ]),

        EditorState.readOnly.of(true),

        // SINGLE copy handler: copies only the selected range(s).
        // With an empty selection it copies nothing, which also blocks
        // CodeMirror's default "copy the whole line" behavior.
        EditorView.domEventHandlers({
          copy(event, view) {
            const { state } = view;

            const text = state.selection.ranges
              .filter((range) => !range.empty)
              .map((range) => state.sliceDoc(range.from, range.to))
              .join("\n");

            event.preventDefault();

            if (text) {
              event.clipboardData.setData("text/plain", text);
            }

            return true;
          },
        }),

        EditorView.theme({
          "&": { height: "100%", fontSize: "14px" },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily:
              '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
          },
          ".cm-gutters": { minHeight: "100%" },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, [isText, loading, previewError, textContent, extension]);

  // -------------------------------------------------------
  // COPY BUTTON / FOLD HANDLERS
  // -------------------------------------------------------

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error("Could not copy code:", error);
    }
  };

  const handleFoldAll = () => {
    if (editorViewRef.current) foldAll(editorViewRef.current);
  };

  const handleUnfoldAll = () => {
    if (editorViewRef.current) unfoldAll(editorViewRef.current);
  };

  // -------------------------------------------------------
  // FONT PREVIEW
  // -------------------------------------------------------

  useEffect(() => {
    if (!isFont || !fileUrl) return;

    let objectUrl;
    let loadedFont;
    let cancelled = false;

    async function loadFont() {
      try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();

        objectUrl = URL.createObjectURL(blob);

        const font = new FontFace("FileHivePreviewFont", `url("${objectUrl}")`);

        await font.load();

        if (cancelled) return;

        loadedFont = font;
        document.fonts.add(font);
      } catch (error) {
        console.error("Could not preview font:", error);
      }
    }

    loadFont();

    return () => {
      cancelled = true;

      if (loadedFont) {
        document.fonts.delete(loadedFont);
      }

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file?.id, isFont, fileUrl]);

  // -------------------------------------------------------
  // ESCAPE KEY
  // -------------------------------------------------------

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // -------------------------------------------------------
  // IMAGE CONTROLS
  // -------------------------------------------------------

  const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

  const zoomIn = useCallback(
    () => setZoom((z) => clampZoom(z + ZOOM_STEP)),
    [],
  );

  const zoomOut = useCallback(
    () => setZoom((z) => clampZoom(z - ZOOM_STEP)),
    [],
  );

  const resetImage = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setOffset({ x: 0, y: 0 });
  }, []);

  const rotateLeft = () => setRotation((r) => r - 90);
  const rotateRight = () => setRotation((r) => r + 90);

  const handleWheelZoom = (event) => {
    const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoom((z) => clampZoom(z + delta));
  };

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    if (!isDragging) return;
    setOffset({
      x: dragStart.current.originX + (event.clientX - dragStart.current.x),
      y: dragStart.current.originY + (event.clientY - dragStart.current.y),
    });
  };

  const handlePointerUp = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  };

  // Reset when a different file is opened
  useEffect(() => {
    if (isImage) resetImage();
  }, [file?.id, isImage, resetImage]);

  // Keyboard shortcuts: + / - / 0 / R
  useEffect(() => {
    if (!isImage) return;

    const handleKey = (event) => {
      if (event.key === "+" || event.key === "=") zoomIn();
      else if (event.key === "-") zoomOut();
      else if (event.key === "0") resetImage();
      else if (event.key.toLowerCase() === "r") setRotation((r) => r + 90);
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isImage, zoomIn, zoomOut, resetImage]);

  // -------------------------------------------------------
  // EARLY RETURN: safe now, every hook above has already run
  // -------------------------------------------------------

  if (!file) return null;

  // -------------------------------------------------------
  // RENDERERS
  // -------------------------------------------------------

  const renderImage = () => {
    const transform = `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${
      flipX ? -zoom : zoom
    }, ${flipY ? -zoom : zoom})`;

    return (
      <div className="file-preview-image-viewer">
        <div className="file-preview-image-toolbar">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            title="Zoom out (-)"
          >
            −
          </button>

          <span className="file-preview-zoom-label">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            title="Zoom in (+)"
          >
            +
          </button>

          <span className="file-preview-toolbar-divider" />

          <button type="button" onClick={rotateLeft} title="Rotate left">
            ⟲
          </button>
          <button type="button" onClick={rotateRight} title="Rotate right (R)">
            ⟳
          </button>

          <span className="file-preview-toolbar-divider" />

          <button
            type="button"
            className={flipX ? "active" : ""}
            onClick={() => setFlipX((v) => !v)}
            title="Flip horizontal"
          >
            ⇆
          </button>
          <button
            type="button"
            className={flipY ? "active" : ""}
            onClick={() => setFlipY((v) => !v)}
            title="Flip vertical"
          >
            ⇅
          </button>

          <span className="file-preview-toolbar-divider" />

          <button type="button" onClick={resetImage} title="Reset (0)">
            Reset
          </button>
        </div>

        <div
          className={`file-preview-image-stage ${isDragging ? "dragging" : ""}`}
          onWheel={handleWheelZoom}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={fileUrl}
            alt={fileName}
            className="file-preview-image"
            draggable={false}
            style={{
              transform,
              transition: isDragging ? "none" : "transform 0.15s ease",
            }}
          />
        </div>
      </div>
    );
  };

  const renderPdf = () => {
    return (
      <div className="file-preview-pdf-wrap">
        <iframe
          src={fileUrl}
          title={`PDF Preview - ${fileName}`}
          className="file-preview-pdf"
          type="application/pdf"
        />
      </div>
    );
  };

  const renderVideo = () => {
    return (
      <div className="file-preview-media-wrap">
        <video
          className="file-preview-video"
          controls
          playsInline
          preload="metadata"
        >
          <source src={fileUrl} type={fileType || "video/mp4"} />
          Your browser does not support video playback.
        </video>
      </div>
    );
  };

  const renderAudio = () => {
    return (
      <div className="file-preview-audio-wrap">
        <div className="file-preview-audio-icon">♪</div>

        <h3>{fileName}</h3>

        <audio controls preload="metadata" className="file-preview-audio">
          <source src={fileUrl} type={fileType || "audio/mpeg"} />
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  };

  const renderText = () => {
    if (loading) {
      return <div className="file-preview-loading">Loading preview...</div>;
    }

    if (previewError) {
      return <div className="file-preview-error">{previewError}</div>;
    }

    return (
      <div className="file-preview-code-wrap">
        <div className="file-preview-code-toolbar">
          <div className="file-preview-code-language">
            {extension ? extension.toUpperCase() : "TEXT"}
          </div>

          <div className="file-preview-code-buttons">
            {extension !== "txt" && (
              <button
                type="button"
                onClick={handleFoldAll}
                className="btn btn-sm teams-btn"
              >
                Fold All
              </button>
            )}
            {extension !== "txt" && (
              <button
                type="button"
                onClick={handleUnfoldAll}
                className="btn btn-sm teams-btn"
              >
                Unfold All
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm teams-btn"
              onClick={handleCopyCode}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div ref={editorRef} className="file-preview-code-editor" />
      </div>
    );
  };

  const renderUnavailable = (icon, title, message) => {
    return (
      <div className="file-preview-unavailable">
        <div className="file-preview-unavailable-icon">{icon}</div>

        <h3>{title}</h3>

        <p>{message}</p>
      </div>
    );
  };

  const renderDocx = () =>
    renderUnavailable(
      "📄",
      "Word Preview Not Available",
      "This Word document cannot be previewed directly in FileHive. Please download the file to open it in Microsoft Word or another compatible application.",
    );

  const renderOldWord = () =>
    renderUnavailable(
      "📄",
      "Doc Preview Not Available",
      "Legacy .doc files cannot be previewed directly in FileHive. Please download the file to open it in Microsoft Word or another compatible application.",
    );

  const renderExcel = () =>
    renderUnavailable(
      "📊",
      "Excel Preview Not Available",
      "Excel files cannot be previewed directly in FileHive. Please download the file to open it in Microsoft Excel or another compatible spreadsheet application.",
    );

  const renderPowerPoint = () =>
    renderUnavailable(
      "📊",
      "Powerpoint Preview Not Available",
      "Powerpoint files cannot be previewed directly in FileHive. Please download the file to open it in Microsoft Powerpoint or another compatible application.",
    );

  const renderArchive = () =>
    renderUnavailable(
      "📦",
      "Compressed Preview Not Available",
      "Compressed files cannot be previewed directly in FileHive. Please download the file to extract the contents of it.",
    );

  const renderFont = () => {
    return (
      <div className="file-preview-font">
        <div className="file-preview-font-header">
          <div className="file-preview-font-icon">Aa</div>

          <div>
            <h3>{fileName}</h3>
            <p>Font Preview</p>
          </div>
        </div>

        <div
          className="file-preview-font-sample"
          style={{
            fontFamily: `"FileHivePreviewFont"`,
          }}
        >
          <div className="font-preview-large">Aa Bb Cc Dd</div>

          <div className="font-preview-medium">
            The quick brown fox jumps over the lazy dog.
          </div>

          <div className="font-preview-small">
            0123456789 &nbsp; ! @ # $ % &amp; * ( )
          </div>
        </div>
      </div>
    );
  };

  const renderBinary = () => {
    return (
      <div className="file-preview-unsupported">
        <div className="file-preview-file-icon">{getFileEmoji(extension)}</div>

        <h3>{fileName}</h3>

        <p>This file format does not have a browser-native preview.</p>

        <div className="file-preview-meta">
          <span>Type: {fileType || `${extension.toUpperCase()} file`}</span>

          <span>Size: {formatBytes(file.fileSize)}</span>
        </div>
      </div>
    );
  };

  const renderGeneric = () => {
    return (
      <div className="file-preview-unsupported">
        <div className="file-preview-file-icon">{getFileEmoji(extension)}</div>

        <h3>{fileName}</h3>

        <p>This file format does not have a browser-native preview.</p>

        <div className="file-preview-meta">
          <span>Type: {fileType || `${extension.toUpperCase()} file`}</span>

          <span>Size: {formatBytes(file.fileSize)}</span>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------
  // MAIN PREVIEW SELECTOR
  // -------------------------------------------------------

  const renderPreview = () => {
    if (isImage) return renderImage();
    if (isPdf) return renderPdf();
    if (isVideo) return renderVideo();
    if (isAudio) return renderAudio();
    if (isDocx) return renderDocx();
    if (isOldWord) return renderOldWord();
    if (isExcel) return renderExcel();
    if (isPowerPoint) return renderPowerPoint();
    if (isText) return renderText();
    if (isArchive) return renderArchive();
    if (isFont) return renderFont();
    if (isBinary) return renderBinary();

    return renderGeneric();
  };

  // -------------------------------------------------------
  // MODAL
  // -------------------------------------------------------

  return (
    <div
      className="file-preview-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="file-preview-modal">
        <div className="file-preview-header">
          <div className="file-preview-title">
            <span className="file-preview-name">{fileName}</span>

            <span className="file-preview-size">
              ({formatBytes(file.fileSize)})
            </span>
          </div>

          <div className="file-preview-actions">
            <button
              type="button"
              className="file-preview-close"
              onClick={onClose}
              title="Close"
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </div>

        <div className="file-preview-content">{renderPreview()}</div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

function formatBytes(bytes) {
  if (!bytes) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB", "TB"];

  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return (
    parseFloat((bytes / Math.pow(1024, index)).toFixed(2)) + " " + units[index]
  );
}

function getFileEmoji(extension) {
  const icons = {
    doc: "📄",
    docx: "📄",
    xls: "📊",
    xlsx: "📊",
    ppt: "📊",
    pptx: "📊",
    csv: "📊",
    zip: "📦",
    rar: "📦",
    "7z": "📦",
    tar: "📦",
    gz: "📦",
    mp3: "🎵",
    wav: "🎵",
    m4a: "🎵",
    mp4: "🎥",
    mov: "🎥",
    webm: "🎥",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    webp: "🖼️",
    svg: "🖼️",
    pdf: "📕",
    txt: "📝",
    json: "📝",
    xml: "📝",
    md: "📝",
    js: "💻",
    jsx: "💻",
    ts: "💻",
    tsx: "💻",
    css: "💻",
    html: "🌐",
  };

  return icons[extension] || "📄";
}
