import { useEffect, useRef, useState } from "react";
import { useSocket } from "../SocketContext";

export default function ChatDrawer({ room, currentUserId, isOpen, onClose }) {
  const { socket, connected } = useSocket();

  const [messages, setMessages] = useState(room?.messages || []);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /*
   * Keep chat history synchronized when room data changes.
   */
  useEffect(() => {
    setMessages(room?.messages || []);
  }, [room?.id, room?.messages]);

  /*
   * Listen for real-time chat messages.
   */
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (newMessage) => {
      setMessages((prev) => {
        /*
         * Prevent duplicate messages.
         */
        if (prev.some((item) => item.id === newMessage.id)) {
          return prev;
        }

        return [...prev, newMessage];
      });
    };

    socket.on("chat_message", handleChatMessage);

    return () => {
      socket.off("chat_message", handleChatMessage);
    };
  }, [socket]);

  /*
   * Automatically scroll to newest message.
   */
  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isOpen]);

  /*
   * Lock body scroll while drawer is open.
   */
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  /*
   * Focus input when drawer opens.
   */
  useEffect(() => {
    if (!isOpen) return;

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [isOpen]);

  const sendMessage = () => {
    if (!socket || !connected || sending) {
      return;
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    setSending(true);

    socket.emit(
      "send_chat_message",
      {
        message: trimmedMessage,
      },
      (response) => {
        setSending(false);

        if (!response?.success) {
          console.error("Failed to send chat message:", response?.message);
          return;
        }

        setMessage("");

        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      },
    );
  };

  const handleKeyDown = (event) => {
    /*
     * Enter sends the message.
     * Shift + Enter creates a new line.
     */
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    if (!date) return "";

    try {
      return new Date(date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getInitial = (name) => {
    if (!name) return "?";

    return name.trim().charAt(0).toUpperCase();
  };

  const onlineMembers =
    room?.members?.filter((item) => item.online).length || 0;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="chat-drawer-overlay">
      <aside className="chat-drawer">
        {/* Header */}
        <div className="chat-drawer-header">
          <div className="chat-drawer-title-wrap">
            <div className="chat-drawer-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 11.5C20 16.194 16.194 20 11.5 20C10.03 20 8.65 19.627 7.45 18.97L4 20L5.03 16.55C4.373 15.35 4 13.97 4 12.5C4 7.806 7.806 4 12.5 4C17.194 4 20 7.806 20 11.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <h3>Chat</h3>

              <span>
                {String(onlineMembers).padStart(2, "0")}{" "}
                {onlineMembers === 1 ? "member" : "members"}
              </span>
            </div>
          </div>

          <div className="chat-drawer-header-actions">
            <div
              className={
                "room-chat-status" +
                (connected ? " room-chat-status--online" : "")
              }
              title={connected ? "Connected" : "Disconnected"}
            >
              <span />
            </div>

            <button
              type="button"
              className="chat-drawer-close"
              onClick={onClose}
              aria-label="Close chat"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-drawer-messages">
          {messages.length === 0 ? (
            <div className="room-chat-empty">
              <div className="room-chat-empty-icon">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 11.5C20 16.194 16.194 20 11.5 20C10.03 20 8.65 19.627 7.45 18.97L4 20L5.03 16.55C4.373 15.35 4 13.97 4 12.5C4 7.806 7.806 4 12.5 4C17.194 4 20 7.806 20 11.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h4>No messages yet</h4>

              <p>Start the conversation with your teammates.</p>
            </div>
          ) : (
            messages.map((item) => {
              console.log("🚀 ~ ChatDrawer ~ item:", item);
              const isOwn = item.senderId === currentUserId;
              console.log("🚀 ~ ChatDrawer ~ currentUserId:", currentUserId);
              console.log("🚀 ~ ChatDrawer ~ isOwn:", isOwn);

              return (
                <div
                  key={item.id}
                  className={
                    "chat-message-row" + (isOwn ? " chat-message-row--own" : "")
                  }
                >
                  {!isOwn && (
                    <div className="chat-avatar">
                      {getInitial(item.senderName)}
                    </div>
                  )}

                  <div className="chat-message-content">
                    {!isOwn && (
                      <div className="chat-sender-name">
                        {item.senderName || "Unknown User"}
                      </div>
                    )}

                    <div className="chat-message-bubble">{item.message}</div>

                    <div className="chat-message-time">
                      {formatTime(item.sentAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="chat-drawer-composer">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connected ? "Type a message..." : "Connecting..."}
            disabled={!connected || sending}
            rows={1}
            maxLength={2000}
          />

          <button
            type="button"
            className="room-chat-send"
            onClick={sendMessage}
            disabled={!connected || sending || !message.trim()}
            aria-label="Send message"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 3L10.5 13.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M21 3L14.3 21L10.5 13.5L3 9.7L21 3Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </aside>
    </div>
  );
}
