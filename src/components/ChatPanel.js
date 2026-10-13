import { useEffect, useRef, useState } from "react";
import { useSocket } from "../SocketContext";

export default function ChatPanel({ room, currentUserId, isOpen, onClose }) {
  const { socket, connected } = useSocket();

  const [messages, setMessages] = useState(room?.messages || []);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});
  const [newMessagesStartId, setNewMessagesStartId] = useState(null);

  const messagesContainerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);
  const typingTimeoutsRef = useRef(new Map());
  const typingEmitTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const notificationsRef = useRef(new Set());

  // Socket handlers ke andar latest isOpen value chahiye (stale closure se bachne ke liye)
  const isOpenRef = useRef(isOpen);

  const isTabActive = () =>
    document.visibilityState === "visible" && document.hasFocus();

  const closeAllNotifications = () => {
    notificationsRef.current.forEach((n) => n.close());
    notificationsRef.current.clear();
  };

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setNewMessagesStartId(null);
      return;
    }

    setUnreadCount(0);

    requestAnimationFrame(() => {
      const divider = messagesContainerRef.current?.querySelector(
        ".chat-new-messages-divider",
      );

      if (divider) {
        divider.scrollIntoView({ block: "center" });
      } else {
        messagesEndRef.current?.scrollIntoView();
      }
    });
  }, [isOpen]);

  useEffect(() => {
    const handleBecameActive = () => {
      if (!isTabActive()) return;

      closeAllNotifications();

      if (isOpenRef.current) {
        setUnreadCount(0);
      }
    };

    document.addEventListener("visibilitychange", handleBecameActive);
    window.addEventListener("focus", handleBecameActive);

    return () => {
      document.removeEventListener("visibilitychange", handleBecameActive);
      window.removeEventListener("focus", handleBecameActive);
      closeAllNotifications();
    };
  }, []);
  useEffect(() => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    document.title =
      unreadCount > 0
        ? `(${unreadCount}) Message`
        : "FileHive - Team File Sharing";
  }, [unreadCount]);

  /*
   * Keep chat history synchronized when room data changes.
   */
  useEffect(() => {
    if (!room?.id) return;

    setMessages(room?.messages || []);
  }, [room?.id, room?.messages]);

  /*
   * Listen for real-time chat messages.
   */
  useEffect(() => {
    if (!socket) return;

    const roomId = room?.id;

    const handleChatMessage = (newMessage) => {
      if (newMessage.roomId && newMessage.roomId !== roomId) {
        return;
      }

      const isOwnMessage = newMessage.senderId === currentUserId;

      // Add message immediately
      setMessages((prev) => {
        if (prev.some((item) => item.id === newMessage.id)) {
          return prev;
        }

        return [...prev, newMessage];
      });

      // Own message
      if (isOwnMessage) {
        shouldScrollToBottomRef.current = true;
        setNewMessagesStartId(null);
        return;
      }

      // Panel tab khula ho aur visible ho tabhi "user dekh raha hai" maana jaye
      const panelVisible =
        isOpenRef.current && document.visibilityState === "visible";

      if (panelVisible && isNearBottom()) {
        // User bottom par hai, seedha neeche scroll karo
        shouldScrollToBottomRef.current = true;
      } else {
        // Panel band hai / tab hidden hai / user upar scroll kar chuka hai
        shouldScrollToBottomRef.current = false;

        // Sirf pehla unread message divider ki position banta hai
        setNewMessagesStartId((current) => current || newMessage.id);
      }

      if (!panelVisible || !isNearBottom()) {
        setUnreadCount((prev) => prev + 1);
      }

      if (
        !isTabActive() &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const notification = new Notification(
          newMessage.senderName || "New message",
          {
            body: newMessage.message,
            icon: "/favicon.ico",
            tag: `chat-${roomId}`, // ek room ki notifications replace hongi, stack nahi
            renotify: true, // phir bhi har naye message par alert aayega
          },
        );

        notificationsRef.current.add(notification);

        notification.onclose = () => {
          notificationsRef.current.delete(notification);
        };

        notification.onclick = () => {
          window.focus();
          closeAllNotifications();
        };
      }
    };

    const handleUserTyping = ({ userId, userName }) => {
      // Don't show your own typing indicator
      if (userId === currentUserId) {
        return;
      }

      setTypingUsers((prev) => ({
        ...prev,
        [userId]: {
          userId,
          userName: userName || "Unknown User",
        },
      }));

      // Reset timeout for this user
      const existingTimeout = typingTimeoutsRef.current.get(userId);

      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });

        typingTimeoutsRef.current.delete(userId);
      }, 2000);

      typingTimeoutsRef.current.set(userId, timeout);
    };

    const handleUserStopTyping = ({ userId }) => {
      if (userId === currentUserId) {
        return;
      }

      const existingTimeout = typingTimeoutsRef.current.get(userId);

      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutsRef.current.delete(userId);
      }

      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    };

    socket.on("chat_message", handleChatMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);

    return () => {
      socket.off("chat_message", handleChatMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);

      typingTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });

      typingTimeoutsRef.current.clear();
    };
    // room (poora object) nahi, sirf room?.id: warna har message par listener dobara lagta hai
  }, [socket, currentUserId, room?.id]);

  /*
   * Automatically scroll to the newest message.
   */
  useEffect(() => {
    if (!shouldScrollToBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    });

    shouldScrollToBottomRef.current = false;
  }, [messages]);

  /*
   * Room change par seedha bottom par jaye.
   */
  useEffect(() => {
    if (!messages.length) return;

    shouldScrollToBottomRef.current = true;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "auto",
      });

      shouldScrollToBottomRef.current = false;
    });
  }, [room?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [typingUsers]);

  const sendMessage = () => {
    if (!socket || !connected || sending) {
      return;
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    if (typingEmitTimeoutRef.current) {
      clearTimeout(typingEmitTimeoutRef.current);
      typingEmitTimeoutRef.current = null;
    }

    socket.emit("stop_typing", {
      roomId: room.id,
      userId: currentUserId,
    });

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

        /*
         * Keep the input focused after sending.
         */
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      },
    );
  };

  const handleKeyDown = (event) => {
    /*
     * Enter sends the message.
     *
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

  const handleMessageChange = (event) => {
    const value = event.target.value;

    setMessage(value);

    if (!socket || !connected) {
      return;
    }

    // Don't send typing event for empty input
    if (!value.trim()) {
      socket.emit("stop_typing", {
        roomId: room.id,
        userId: currentUserId,
      });

      return;
    }

    // Tell other users that we're typing
    socket.emit("typing", {
      roomId: room.id,
      userId: currentUserId,
      userName:
        room?.members?.find((member) => member.id === currentUserId)?.name ||
        "Unknown User",
    });

    // Clear previous stop timer
    if (typingEmitTimeoutRef.current) {
      clearTimeout(typingEmitTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingEmitTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        roomId: room.id,
        userId: currentUserId,
      });

      typingEmitTimeoutRef.current = null;
    }, 3000);
  };

  const isNearBottom = () => {
    const container = messagesContainerRef.current;

    if (!container) return true;

    const threshold = 80;

    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      threshold
    );
  };

  /*
   * Divider yahan clear nahi hota. Agar divider tak scroll karte hi
   * (bottom ke qareeb hone par) clear ho jaye to user usay dekh hi nahi
   * paata. Divider panel band hone par ya apna message bhejne par clear hota hai.
   */
  const handleMessagesScroll = () => {
    if (!isOpenRef.current) return;

    if (isNearBottom()) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    };

    document.addEventListener("focusin", handleFocus);

    return () => {
      document.removeEventListener("focusin", handleFocus);
    };
  }, []);

  return (
    <aside className="room-chat">
      {/* Header */}
      <div className="room-chat-header">
        <div className="room-chat-title-wrap">
          <div className="room-chat-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-messages-square preview-icon"
            >
              <path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              <path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1" />
            </svg>
          </div>

          <div>
            <h3>Chat</h3>
            <span>
              {String(room?.members?.filter((i) => i.online).length).padStart(
                2,
                "0",
              ) || 0}{" "}
              {room?.members?.filter((i) => i.online).length === 1
                ? "member"
                : "members"}
            </span>
          </div>
        </div>

        <div className="close-connected">
          <div
            className={
              "room-chat-status" +
              (connected ? " room-chat-status--online" : "")
            }
            title={connected ? "Connected" : "Disconnected"}
          >
            <span />
          </div>
          <button type="button" className="chat-panel-close" onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="room-chat-messages"
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
      >
        {messages.length === 0 ? (
          <div className="room-chat-empty">
            <div className="room-chat-empty-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-messages-square preview-icon"
              >
                <path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                <path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1" />
              </svg>
            </div>

            <h4>No messages yet</h4>

            <p>Start the conversation with your teammates.</p>
          </div>
        ) : (
          messages?.map((item) => {
            const isOwn = item.senderId === currentUserId;
            const showNewDivider = item.id === newMessagesStartId;

            return (
              <div key={item.id}>
                {showNewDivider && (
                  <div className="chat-new-messages-divider">
                    <span>New messages</span>
                  </div>
                )}

                <div
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
              </div>
            );
          })
        )}

        {Object.values(typingUsers).map((typingUser) => (
          <div
            key={typingUser.userId}
            className="chat-message-row chat-message-row--typing"
          >
            <div className="chat-avatar">{getInitial(typingUser.userName)}</div>

            <div className="chat-typing-content">
              <div className="chat-sender-name">{typingUser.userName}</div>

              <div className="chat-typing-indicator">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="room-chat-composer">
        <textarea
          ref={inputRef}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          placeholder={connected ? "Type a message..." : "Connecting..."}
          disabled={!connected || sending}
          rows={1}
          autoFocus
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
  );
}
