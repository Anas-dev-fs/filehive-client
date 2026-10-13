import React from "react";

const FilesPanel = ({
  room,
  setShowMobileFiles,
  downloadFile,
  fileIcon,
  formatBytes,
}) => {
  const files = room?.files || [];

  return (
    <>
      <div
        className="panel-overlay"
        onClick={() => setShowMobileFiles(false)}
      />

      <div className="side-drawer">
        <div className="side-drawer-header">
          <h3>Files</h3>

          <button
            className="sd-close"
            onClick={() => setShowMobileFiles(false)}
          >
            ✕
          </button>
        </div>

        <div className="side-drawer-body">
          {files.length === 0 ? (
            <div className="sd-empty">No files in this room yet</div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="sidebar-file-item"
                onClick={() => downloadFile(file)}
              >
                <div className="sf-icon">{fileIcon(file.fileType)}</div>

                <div className="sf-info">
                  <div className="sf-name">{file.fileName}</div>

                  <div className="sf-meta">
                    {file.uploadedBy} · {formatBytes(file.fileSize)}
                  </div>
                </div>

                <div className="file-dl-btn" title="Download">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 18.327 16.945"
                  >
                    <g id="XMLID_190_" transform="translate(-69.855 -103.662)">
                      <g
                        id="XMLID_192_"
                        transform="translate(84.754 116.02) rotate(180)"
                      >
                        <g id="XMLID_24_" transform="translate(0 0)">
                          <path
                            id="XMLID_28_"
                            d="M1.768,6.448,3.351,4.864,5.872,2.343l.577-.577H4.982L6.565,3.35,9.086,5.871l.577.577a1.042,1.042,0,0,0,1.469,0,1.045,1.045,0,0,0,.3-.735,1.089,1.089,0,0,0-.3-.735L9.549,3.4,7.028.874,6.451.3A1.054,1.054,0,0,0,4.984.3L3.4,1.88.88,4.4.3,4.978a1.042,1.042,0,0,0,0,1.469,1.045,1.045,0,0,0,.735.3A1.088,1.088,0,0,0,1.768,6.448Z"
                            fill="#f0c040"
                          />
                        </g>
                      </g>

                      <g
                        id="XMLID_191_"
                        transform="translate(80.081 116.026) rotate(180)"
                      >
                        <g id="XMLID_19_" transform="translate(0 0)">
                          <path
                            id="XMLID_23_"
                            d="M2.078,11.326V2.3c0-.415.006-.832,0-1.247V1.038A1.08,1.08,0,0,0,1.775.3,1.042,1.042,0,0,0,.306.3a1.076,1.076,0,0,0-.3.735V10.06c0,.415-.006.832,0,1.247v.019a1.08,1.08,0,0,0,.3.735,1.042,1.042,0,0,0,1.469,0A1.086,1.086,0,0,0,2.078,11.326Z"
                            fill="#f0c040"
                          />
                        </g>
                      </g>

                      <g id="XMLID_193_" transform="translate(69.855 115.19)">
                        <g id="XMLID_12_" transform="translate(0 0)">
                          <path
                            id="XMLID_16_"
                            d="M86.118,660.3v1.888a4.087,4.087,0,0,1-.01.529l.037-.276a1.21,1.21,0,0,1-.075.27c.035-.083.071-.166.1-.247a1.176,1.176,0,0,1-.139.236l.162-.209a1.216,1.216,0,0,1-.193.193l.21-.162a1.176,1.176,0,0,1-.237.139l.247-.1a1.21,1.21,0,0,1-.27.075l.276-.037a3.9,3.9,0,0,1-.492.01H71.979a1.39,1.39,0,0,1-.16-.01l.276.037a1.21,1.21,0,0,1-.27-.075l.247.1a1.176,1.176,0,0,1-.237-.139l.21.162a1.215,1.215,0,0,1-.193-.193l.162.209a1.176,1.176,0,0,1-.139-.236c.035.083.071.166.1.247a1.21,1.21,0,0,1-.075-.27l.037.276a3.461,3.461,0,0,1-.01-.44V660.3a1.08,1.08,0,0,0-.3-.734,1.042,1.042,0,0,0-1.469,0,1.076,1.076,0,0,0-.3.734v1.23c0,.342,0,.683,0,1.025a2.467,2.467,0,0,0,.062.523,2.112,2.112,0,0,0,.481.9,2.089,2.089,0,0,0,1.56.7c.332,0,.666,0,1,0H86.081a2.242,2.242,0,0,0,.963-.237,1.666,1.666,0,0,0,.315-.21,1.69,1.69,0,0,0,.3-.274,2.1,2.1,0,0,0,.471-.907,2.715,2.715,0,0,0,.056-.5V660.3a1.08,1.08,0,0,0-.3-.734,1.042,1.042,0,0,0-1.469,0A1.126,1.126,0,0,0,86.118,660.3Z"
                            transform="translate(-69.856 -659.262)"
                            fill="#f0c040"
                          />
                        </g>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default FilesPanel;
