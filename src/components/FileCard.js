import { fileIcon, formatBytes, formatTime } from "../helpers/functions";
import FilePreviewModal from "./FilePreviewModal";

const FileCard = ({
  file,
  onDownload,
  onDelete,
  onPreview,
  isOwn,
  deleting,
  downloadCount,
  totalMembers,
  previewFileData,
  roomId,
  onClose,
  serial,
}) => {
  return (
    <>
      <div
        className={
          "file-card" + (isOwn ? " own" : "") + (deleting ? " deleting" : "")
        }
      >
        <h4 className="serial-count">{String(serial).padStart(2, "0")}</h4>
        <div className="file-card-icon">{fileIcon(file.fileType)}</div>
        <div className="file-items-div">
          <div className="file-card-body">
            <div className="file-card-name">{file.fileName}</div>
            <div className="file-card-meta">
              {/* <span>{isOwn ? "You" : file.uploadedBy}</span> */}
              {/* <span className="dot">·</span> */}
              <span>{formatBytes(file.fileSize)}</span>
              <span className="dot">·</span>
              <span>{formatTime(file.uploadedAt)}</span>
            </div>
          </div>
          <div className="file-card-actions">
            {downloadCount > 0 && (
              <div className="download-count">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18.622"
                  height="18.7"
                  viewBox="0 0 18.622 18.7"
                >
                  <path
                    id="Path_19589"
                    data-name="Path 19589"
                    d="M14.019,2.039a.85.85,0,0,0-.512,1.621,1.539,1.539,0,0,1,.668.637,2.884,2.884,0,0,1,0,3.055,1.539,1.539,0,0,1-.668.637.85.85,0,0,0,.512,1.621,3.148,3.148,0,0,0,1.588-1.341,4.584,4.584,0,0,0,0-4.888,3.148,3.148,0,0,0-1.588-1.341ZM12.488,5.825A3.825,3.825,0,1,1,8.663,2,3.825,3.825,0,0,1,12.488,5.825ZM8.663,11.349a7.978,7.978,0,0,1,5.1,1.553q0,.073,0,.147v1.7a2.55,2.55,0,0,0-1.9,4.25H2.714a1.58,1.58,0,0,1-1.6-1.84,7.155,7.155,0,0,1,1.731-3.6A7.538,7.538,0,0,1,8.663,11.349Zm10.8,5.349a.85.85,0,0,1,0,1.2l-2.55,2.55a.85.85,0,0,1-1.2,0l-2.55-2.55a.85.85,0,1,1,1.2-1.2l1.1,1.1V13.049a.85.85,0,1,1,1.7,0V17.8l1.1-1.1A.85.85,0,0,1,19.464,16.7Z"
                    transform="translate(-1.091 -2)"
                    fill="#57c77d"
                    fillRule="evenodd"
                  />
                </svg>
                <span
                  className="dl-count"
                  title={`${downloadCount} of ${totalMembers} downloaded`}
                >
                  {String(downloadCount).padStart(2, "0")}/
                  {String(totalMembers).padStart(2, "0")}
                </span>
              </div>
            )}
            <button
              className="preview-item"
              onClick={() => onPreview?.(file, roomId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPreview?.(file, roomId);
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-eye preview-icon"
              >
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button
              className="file-dl-btn"
              onClick={() => onDownload(file)}
              title="Download"
            >
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
            </button>
            {onDelete && (
              <button
                className="file-del-btn"
                onClick={onDelete}
                disabled={deleting}
                title="Delete"
              >
                <svg
                  id="Group_34420"
                  data-name="Group 34420"
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 14.893 16.945"
                >
                  <g
                    id="Group_628"
                    data-name="Group 628"
                    transform="translate(1.028 5.021)"
                  >
                    <g
                      id="Group_627"
                      data-name="Group 627"
                      transform="translate(0)"
                    >
                      <path
                        id="Path_608"
                        data-name="Path 608"
                        d="M62.205,150l.88,10.565a1.5,1.5,0,0,0,1.485,1.359h8.108a1.5,1.5,0,0,0,1.485-1.359L75.042,150Zm3.934,9.948a.5.5,0,0,1-.5-.463l-.5-7.972a.5.5,0,0,1,.465-.524.488.488,0,0,1,.527.462l.5,7.972A.5.5,0,0,1,66.139,159.948Zm2.981-.494a.5.5,0,0,1-.994,0v-7.972a.5.5,0,0,1,.994,0Zm2.98-7.941-.5,7.972a.5.5,0,0,1-.992-.062l.5-7.972a.5.5,0,0,1,.527-.462A.5.5,0,0,1,72.1,151.513Z"
                        transform="translate(-62.205 -150)"
                        fill="#ed4040"
                      />
                    </g>
                  </g>
                  <g
                    id="Group_630"
                    data-name="Group 630"
                    transform="translate(0)"
                  >
                    <g
                      id="Group_629"
                      data-name="Group 629"
                      transform="translate(0)"
                    >
                      <path
                        id="Path_609"
                        data-name="Path 609"
                        d="M44.9,1.976H41.922V1.482A1.487,1.487,0,0,0,40.432,0H36.461a1.487,1.487,0,0,0-1.489,1.482v.494H31.993a.988.988,0,1,0,0,1.976H44.9a.988.988,0,1,0,0-1.976Zm-3.971,0H35.964V1.482a.5.5,0,0,1,.5-.494h3.971a.5.5,0,0,1,.5.494Z"
                        transform="translate(-31 0)"
                        fill="#ed4040"
                      />
                    </g>
                  </g>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      {previewFileData && (
        <FilePreviewModal
          file={previewFileData.file}
          url={previewFileData.url}
          onClose={onClose}
        />
      )}
    </>
  );
};

export default FileCard;
