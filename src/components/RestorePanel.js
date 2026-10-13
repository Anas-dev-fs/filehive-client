import { useState, useEffect } from "react";
import Swal from "sweetalert2";

const API = process.env.REACT_APP_BACKEND_API_URL;

const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export default function RestorePanel({ room, currentUserId, onClose }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const deletedFiles = room?.deletedFiles?.filter(
    (file) => file?.deleted && file.deletedBy === currentUserId,
  );

  // Jo files room se ghayab ho gayi hain unhein selection se nikal do
  useEffect(() => {
    const existing = new Set((deletedFiles || []).map((f) => f.id));
    setSelectedIds((prev) => prev.filter((id) => existing.has(id)));
  }, [room?.deletedFiles]);

  const allSelected =
    deletedFiles?.length > 0 && selectedIds.length === deletedFiles.length;

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : deletedFiles.map((f) => f.id));

  const restoreFile = async (file) => {
    try {
      const response = await fetch(
        `${API}/api/rooms/${room.id}/files/${file.id}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requesterId: currentUserId }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to restore file");
      }
      // Server socket event will update the room
    } catch (error) {
      console.error("Restore error:", error);
    }
  };

  // Single + multiple dono isi function se
  const permanentlyDeleteFiles = async (files) => {
    const fileIds = files.map((f) => f.id);

    const nameById = Object.fromEntries(files.map((f) => [f.id, f.fileName]));

    setIsDeleting(true);
    try {
      const response = await fetch(`${API}/api/rooms/${room.id}/files`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: currentUserId, fileIds }),
      });

      const data = await response.json();

      // Request hi fail ho gayi (room not found, bad request, etc.)
      if (!Array.isArray(data.deleted) || !Array.isArray(data.failed)) {
        throw new Error(data.error || "Failed to delete files");
      }
      if (
        !response.ok &&
        data.deleted.length === 0 &&
        data.failed.length === 0
      ) {
        throw new Error(data.error || "Failed to delete files");
      }

      setSelectedIds((prev) =>
        prev.filter((id) => !data.deleted.some((d) => d.id === id)),
      );

      if (data.failed.length === 0) {
        await Swal.fire({
          icon: "success",
          title: "Deleted",
          text:
            files.length === 1
              ? `"${files[0].fileName}" deleted permanently.`
              : "All selected files deleted.",
        });
      } else {
        const failedList = data.failed
          .map(
            (f) =>
              `<li>${escapeHtml(f.fileName || nameById[f.id] || f.id)}</li>`,
          )
          .join("");

        await Swal.fire({
          icon: "warning",
          title: `${data.deleted.length} deleted, ${data.failed.length} failed`,
          html: `<p>These files could not be deleted:</p>
                 <ul style="text-align:left;max-height:200px;overflow:auto">${failedList}</ul>`,
        });
      }
    } catch (error) {
      console.error("Permanent delete error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Something went wrong.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePermanentDelete = async (files) => {
    if (!files.length) return;

    const text =
      files.length === 1
        ? `"${files[0].fileName}" will be permanently removed from the server.`
        : `${files.length} selected files will be permanently removed from the server.`;

    const result = await Swal.fire({
      title: "Delete permanently?",
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete Permanently",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    await permanentlyDeleteFiles(files);
  };

  const handleDeleteSelected = () =>
    handlePermanentDelete(
      deletedFiles.filter((f) => selectedIds.includes(f.id)),
    );

  return (
    <div className="teams-panel">
      <div className="tp-header">
        <div className="tp-header-left">
          <h2 className="tp-title">Restore Files</h2>
        </div>
        <button className="tp-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {deletedFiles?.length > 0 ? (
        <>
          <div className="recycle-list">
            {selectedIds.length > 0 && (
              <div
                className="recycle-toolbar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  // padding: "8px 12px",
                  marginBottom: "12px",
                }}
              >
                <h5
                  className="file-card-name"
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={isDeleting}
                  />
                  Select all ({selectedIds.length}/{deletedFiles.length})
                </h5>

                <button
                  className="btn btn-sm delete-btn"
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.length === 0 || isDeleting}
                >
                  Delete Selected ({selectedIds.length})
                </button>
              </div>
            )}
            {deletedFiles.map((file) => (
              <div key={file.id} className="file-card recycle">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(file.id)}
                  onChange={() => toggleSelect(file.id)}
                  disabled={isDeleting}
                />
                <div className="file-card-recycle-details">
                  <div className="file-card-name">{file.fileName}</div>

                  <div className="recycle-actions">
                    <button
                      className="btn btn-sm restore-btn"
                      onClick={() => restoreFile(file)}
                      disabled={isDeleting}
                    >
                      Restore
                    </button>

                    <button
                      className="btn btn-sm delete-btn"
                      onClick={() => handlePermanentDelete([file])}
                      disabled={isDeleting}
                    >
                      Delete Permanently
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "80%",
            padding: "0 20px",
            textAlign: "center",
            fontSize: "14px",
          }}
        >
          <h3>No deleted files to restore or permanently delete</h3>
        </div>
      )}
    </div>
  );
}
