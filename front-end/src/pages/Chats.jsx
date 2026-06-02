import { useEffect, useState } from "react";
import { MessageSquare, Search, Phone, Video, MoreVertical, Send, User } from "lucide-react";
import { useChats } from "../hooks/useChats";
import Skeleton from "../components/ui/Skeleton";
import { useI18n } from "../context/I18nContext.jsx";
import "../styles/chats.css";


const formatMessageTime = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(date));
};

const formatConversationTime = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
};

export default function Chats() {
  const { t } = useI18n();
  const { conversations = [], isLoading, sendReply, isSending, markAsRead } = useChats();
  const [selectedCustomerNumber, setSelectedCustomerNumber] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageDraft, setMessageDraft] = useState("");

  const filteredChats = conversations.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.customerNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedChat = conversations.find((c) => c.customerNumber === selectedCustomerNumber) || filteredChats[0];

  // Auto-mark as read when chat is selected
  useEffect(() => {
    if (selectedChat?.customerNumber && selectedChat.unread > 0) {
      markAsRead(selectedChat.customerNumber);
    }
  }, [selectedChat?.customerNumber, selectedChat?.unread, markAsRead]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = messageDraft.trim();
    if (!selectedChat || !body) return;
    try {
      await sendReply({ customerNumber: selectedChat.customerNumber, body });
      setMessageDraft("");
    } catch { /* handled by hook */ }
  };

  return (
    <div className="chats-shell">
      {/* SIDEBAR */}
      <div className="chats-sidebar">
        <div className="chats-sidebar-header">
          <h2>{t("chats.title")}</h2>
          <div className="search-box" style={{ width: "100%" }}>
            <Search className="search-box-icon" />
            <input
              type="text"
              placeholder={t("chats.searchPlaceholder") || t("orders.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-box-input"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div className="chats-list">
          {isLoading ? (
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} style={{ height: "64px", borderRadius: "var(--radius-md)" }} />
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="chat-empty" style={{ padding: "32px 16px" }}>
              <MessageSquare size={40} />
              <h3>{t("chats.noConversations") || "No conversations"}</h3>
              <p>{t("chats.noConversationsSubtitle") || "Incoming WhatsApp messages will appear here."}</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.customerNumber}
                type="button"
                onClick={() => setSelectedCustomerNumber(chat.customerNumber)}
                className={`chat-item ${selectedChat?.customerNumber === chat.customerNumber ? "active" : ""}`}
              >
                <div className="chat-avatar">
                  <User size={20} />
                  <div className="chat-avatar-online" />
                </div>
                <div className="chat-info">
                  <div className="chat-name-row">
                    <span className="chat-name">{chat.name}</span>
                    <span className="chat-time">{formatConversationTime(chat.lastMessageAt)}</span>
                  </div>
                  <p className="chat-last-message">{chat.lastMessage}</p>
                </div>
                {chat.unread > 0 && (
                  <div className="chat-unread-badge">{chat.unread}</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-main-header">
              <div className="chat-main-header-left">
                <div className="chat-main-avatar"><User size={20} /></div>
                <div>
                  <div className="chat-main-name">{selectedChat.name}</div>
                  <div className="chat-main-number">{selectedChat.customerNumber}</div>
                </div>
              </div>
              <div className="chat-main-actions">
                <button type="button" className="chat-action-btn" aria-label="Call"><Phone size={18} /></button>
                <button type="button" className="chat-action-btn" aria-label="Video"><Video size={18} /></button>
                <button type="button" className="chat-action-btn" aria-label="More"><MoreVertical size={18} /></button>
              </div>
            </div>

            <div className="chat-messages">
              <div className="chat-date-label">
                <span className="chat-date-pill">{t("chats.conversation") || "Conversation"}</span>
              </div>

              {selectedChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-group ${msg.sender === "customer" ? "customer" : "agent"}`}
                >
                  <div className={`message-bubble ${msg.sender === "customer" ? "customer" : "agent"}`}>
                    {msg.text}
                  </div>
                  <span className="message-time">{formatMessageTime(msg.createdAt)}</span>
                </div>
              ))}
            </div>

            <div className="chat-input-area">
              <form onSubmit={handleSend} className="chat-input-row">
                <div className="chat-input-box">
                  <input
                    type="text"
                    placeholder={t("chats.typeMessage")}
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    className="chat-input"
                  />
                  <button
                    type="submit"
                    className="chat-send-icon-btn"
                    disabled={isSending || !messageDraft.trim()}
                    aria-label="Send"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>

          </>
        ) : (
          <div className="chat-empty">
            <MessageSquare size={48} style={{ opacity: 0.1 }} />
            <h3>{t("chats.noSelectedChat")}</h3>
            <p>{t("chats.noSelectedChatSubtitle") || "Pick a chat from the list to start messaging."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
