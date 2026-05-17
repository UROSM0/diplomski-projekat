import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { IChatAPI } from "../api/chat/IChatAPI";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { ConversationDTO } from "../models/chat/ConversationDTO";
import { MessageDTO } from "../models/chat/MessageDTO";

type ChatPageProps = {
  chatAPI: IChatAPI;
  userAPI: IUserAPI;
};

export const ChatPage: React.FC<ChatPageProps> = ({ chatAPI, userAPI }) => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    if (conversationId) {
      setSelectedConversationId(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    const loadConversations = async () => {
      if (!token) return;

      setIsLoadingConversations(true);
      setPageError("");

      try {
        const loadedConversations = await chatAPI.getConversations(token);
        setConversations(loadedConversations);

        if (!selectedConversationId && loadedConversations[0]) {
          setSelectedConversationId(loadedConversations[0].id);
        }
      } catch {
        setPageError("Failed to load conversations.");
      } finally {
        setIsLoadingConversations(false);
      }
    };

    void loadConversations();
  }, [chatAPI, selectedConversationId, token]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!token || !selectedConversationId) {
        setMessages([]);
        return;
      }

      setIsLoadingMessages(true);
      setPageError("");

      try {
        const loadedMessages = await chatAPI.getMessages(token, selectedConversationId);
        setMessages(loadedMessages);
        await chatAPI.markConversationAsRead(token, selectedConversationId);
      } catch {
        setPageError("Failed to load messages.");
      } finally {
        setIsLoadingMessages(false);
      }
    };

    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [chatAPI, selectedConversationId, token]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedConversationId || !messageDraft.trim()) return;

    const content = messageDraft.trim();
    setMessageDraft("");
    setPageError("");

    try {
      const message = await chatAPI.sendMessage(token, selectedConversationId, { content });
      setMessages((current) => [...current, message]);
      const loadedConversations = await chatAPI.getConversations(token);
      setConversations(loadedConversations);
    } catch {
      setMessageDraft(content);
      setPageError("Failed to send message.");
    }
  };

  const getOtherParticipantId = (conversation: ConversationDTO): string => {
    if (!user) return "-";
    return conversation.participantOneId === user.id
      ? conversation.participantTwoId
      : conversation.participantOneId;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, rgba(96,205,255,0.14), transparent 28%), linear-gradient(180deg, #181818 0%, #111111 100%)",
      }}
    >
      <DashboardNavbar userAPI={userAPI} activePage="chat" />

      <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "32px 20px 48px" }}>
        <section className="card" style={{ marginBottom: "20px" }}>
          <div className="flex justify-between gap-3" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ marginBottom: "8px" }}>Chat</h1>
              <p style={{ marginBottom: 0 }}>Conversations are refreshed every few seconds.</p>
            </div>
            {pageError ? <p style={{ marginBottom: 0 }}>{pageError}</p> : null}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <aside className="card" style={{ minHeight: "560px" }}>
            <h2 style={{ marginBottom: "16px" }}>Conversations</h2>
            {isLoadingConversations ? <p>Loading...</p> : null}
            {!isLoadingConversations && !conversations.length ? (
              <p style={{ marginBottom: 0 }}>No conversations yet.</p>
            ) : null}
            <div className="flex flex-col gap-3">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={conversation.id === selectedConversationId ? "btn btn-accent" : "btn btn-ghost"}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  style={{
                    justifyContent: "flex-start",
                    textAlign: "left",
                    minHeight: "76px",
                    whiteSpace: "normal",
                  }}
                >
                  <div>
                    <strong>{conversation.adTitle}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
                      User: {getOtherParticipantId(conversation)}
                    </p>
                    {conversation.lastMessage ? (
                      <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
                        {conversation.lastMessage.content}
                      </p>
                    ) : null}
                    {conversation.unreadCount ? (
                      <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
                        Unread: {conversation.unreadCount}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <article className="card" style={{ minHeight: "560px", display: "flex", flexDirection: "column" }}>
            {selectedConversation ? (
              <>
                <div style={{ borderBottom: "1px solid var(--win11-divider)", paddingBottom: "16px" }}>
                  <h2 style={{ marginBottom: "6px" }}>{selectedConversation.adTitle}</h2>
                  <p style={{ marginBottom: 0 }}>User: {getOtherParticipantId(selectedConversation)}</p>
                </div>

                <div
                  className="flex flex-col gap-3"
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "18px 0",
                    minHeight: "360px",
                  }}
                >
                  {isLoadingMessages ? <p>Loading messages...</p> : null}
                  {!isLoadingMessages && !messages.length ? <p>No messages yet.</p> : null}
                  {messages.map((message) => {
                    const isMine = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        style={{
                          alignSelf: isMine ? "flex-end" : "flex-start",
                          maxWidth: "72%",
                          padding: "12px 14px",
                          borderRadius: "12px",
                          background: isMine ? "var(--win11-accent)" : "rgba(255,255,255,0.06)",
                          color: isMine ? "#000" : "var(--win11-text-primary)",
                          border: "1px solid var(--win11-divider)",
                        }}
                      >
                        <p style={{ marginBottom: "6px" }}>{message.content}</p>
                        <span style={{ fontSize: "11px", opacity: 0.75 }}>
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-3" style={{ alignItems: "stretch" }}>
                  <input
                    type="text"
                    placeholder="Write a message..."
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-accent" type="submit" disabled={!messageDraft.trim()}>
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center" style={{ flex: 1 }}>
                <p style={{ marginBottom: 0 }}>Select a conversation.</p>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
};
