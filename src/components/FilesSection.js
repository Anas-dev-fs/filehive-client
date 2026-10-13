import React from "react";
import NoFilesShared from "../svg/NoFilesShared";
import FileCard from "./FileCard";

const FilesSection = ({
  room,
  othersFiles,
  myFiles,
  downloadFile,
  deleteFile,
  deletingId,
  downloadMap,
  previewFile,
  previewFileData,
  setPreviewFileData,
  loading,
}) => {
  const filesByUploader = othersFiles.reduce((groups, file) => {
    const uploaderId = file.uploaderId;

    if (!groups[uploaderId]) {
      groups[uploaderId] = {
        uploaderName: file.uploadedBy,
        files: [],
      };
    }

    groups[uploaderId].files.push(file);

    return groups;
  }, {});

  return (
    <div className="file-section">
      {room.files.length === 0 ? (
        <NoFilesShared />
      ) : (
        <>
          {/* {loading && (
            <div className="file-list">
              <div className="file-card">
                <div className="upload-skeleton__icon" />
                <div className="upload-skeleton__content">
                  <div className="upload-skeleton__title" />
                  <div className="upload-skeleton__meta" />
                </div>
                <div className="upload-skeleton__action" />
              </div>
            </div>
          )} */}
          {othersFiles.length > 0 &&
            Object.entries(filesByUploader).map(
              ([uploaderId, { uploaderName, files }]) => (
                <div className="file-group" key={uploaderId}>
                  <h3 className="file-group-label">
                    From {uploaderName} (
                    <span>
                      {files.length} {files.length > 1 ? "Files" : "File"}
                    </span>
                    )
                  </h3>

                  <div className="file-list">
                    {files.map((file) => (
                      <FileCard
                        serial={file.serialNumber}
                        key={file.id}
                        file={file}
                        onDownload={downloadFile}
                        onDelete={null}
                        isOwn={false}
                        deleting={deletingId === file.id}
                        downloadCount={downloadMap[file.id]?.size || 0}
                        totalMembers={room.memberCount}
                        onPreview={previewFile}
                        previewFileData={previewFileData}
                        roomId={room?.id}
                        onClose={() => setPreviewFileData(null)}
                      />
                    ))}
                  </div>
                </div>
              ),
            )}
          {myFiles.length > 0 && (
            <div className="file-group">
              <h3 className="file-group-label">
                Your files (
                <span>
                  {myFiles.length} {myFiles.length > 1 ? "Files" : "File"}
                </span>
                )
              </h3>
              <div className="file-list">
                {myFiles.map((file) => (
                  <FileCard
                    serial={file.serialNumber}
                    key={file.id}
                    file={file}
                    onDownload={downloadFile}
                    onDelete={() => deleteFile(file)}
                    isOwn={true}
                    deleting={deletingId === file.id}
                    downloadCount={downloadMap[file.id]?.size || 0}
                    totalMembers={room.memberCount}
                    onPreview={previewFile}
                    previewFileData={previewFileData}
                    roomId={room?.id}
                    onClose={() => setPreviewFileData(null)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FilesSection;
