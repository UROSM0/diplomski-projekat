import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { IChatAPI } from "../api/chat/IChatAPI";
import { getErrorMessage } from "../api/shared/apiError";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { ConversationDTO } from "../models/chat/ConversationDTO";
import { MessageDTO } from "../models/chat/MessageDTO";
import { PublicUserDTO } from "../models/users/PublicUserDTO";
import { formatUserDisplayName } from "../utils/userDisplay";

type ChatPageProps = {
  chatAPI: IChatAPI;
  userAPI: IUserAPI;
};

type NewMessageEvent = {
  message: MessageDTO;
  conversation: ConversationDTO;
};

type ConversationReadEvent = {
  conversationId: string;
  readByUserId: string;
};

export const ChatPage: React.FC<ChatPageProps> = ({ chatAPI, userAPI }) => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [participantDirectory, setParticipantDirectory] = useState<Record<string, PublicUserDTO>>({});
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [pageError, setPageError] = useState("");
  const selectedConversationIdRef = useRef("");

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

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
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje razgovora nije uspelo."));
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
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje poruka nije uspelo."));
      } finally {
        setIsLoadingMessages(false);
      }
    };

    void loadMessages();
  }, [chatAPI, selectedConversationId, token]);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const gatewayUrl = import.meta.env.VITE_GATEWAY_URL as string;
    const socketUrl = import.meta.env.VITE_SOCKET_URL || new URL(gatewayUrl).origin;
    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("conversation:updated", (conversation: ConversationDTO) => {
      setConversations((current) => {
        const exists = current.some((item) => item.id === conversation.id);
        const next = exists
          ? current.map((item) => (item.id === conversation.id ? { ...item, ...conversation } : item))
          : [conversation, ...current];
        return next.sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));
      });
    });

    socket.on("message:new", ({ message, conversation }: NewMessageEvent) => {
      const isSelected = selectedConversationIdRef.current === message.conversationId;

      if (isSelected) {
        setMessages((current) =>
          current.some((item) => item.id === message.id) ? current : [...current, message]
        );

        if (message.senderId !== user.id) {
          void chatAPI.markConversationAsRead(token, message.conversationId);
        }
      }

      setConversations((current) => {
        const existing = current.find((item) => item.id === conversation.id);
        const unreadCount = message.senderId !== user.id && !isSelected
          ? (existing?.unreadCount ?? 0) + 1
          : 0;
        const updated = { ...existing, ...conversation, lastMessage: message, unreadCount } as ConversationDTO;
        const next = existing
          ? current.map((item) => (item.id === conversation.id ? updated : item))
          : [updated, ...current];
        return next.sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));
      });
    });

    socket.on("conversation:read", ({ conversationId: readConversationId, readByUserId }: ConversationReadEvent) => {
      if (selectedConversationIdRef.current === readConversationId) {
        setMessages((current) =>
          current.map((message) =>
            message.senderId !== readByUserId ? { ...message, isRead: true } : message
          )
        );
      }

      if (readByUserId === user.id) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === readConversationId ? { ...conversation, unreadCount: 0 } : conversation
          )
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [chatAPI, token, user]);

  useEffect(() => {
    const loadParticipantDirectory = async () => {
      if (!token || !user || !conversations.length) {
        setParticipantDirectory({});
        return;
      }

      const otherParticipantIds = Array.from(
        new Set(
          conversations.map((conversation) =>
            conversation.participantOneId === user.id
              ? conversation.participantTwoId
              : conversation.participantOneId
          )
        )
      );

      const users = await Promise.allSettled(
        otherParticipantIds.map(async (participantId) => ({
          participantId,
          profile: await userAPI.getPublicUserById(participantId),
        }))
      );

      const nextDirectory = users.reduce<Record<string, PublicUserDTO>>((directory, result) => {
        if (result.status === "fulfilled") {
          directory[result.value.participantId] = result.value.profile;
        }

        return directory;
      }, {});

      setParticipantDirectory(nextDirectory);
    };

    void loadParticipantDirectory();
  }, [conversations, token, user, userAPI]);

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
      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message]
      );
    } catch (error) {
      setMessageDraft(content);
      setPageError(getErrorMessage(error, "Slanje poruke nije uspelo."));
    }
  };

  const getOtherParticipantId = (conversation: ConversationDTO): string => {
    if (!user) return "";
    return conversation.participantOneId === user.id
      ? conversation.participantTwoId
      : conversation.participantOneId;
  };

  const getOtherParticipantLabel = (conversation: ConversationDTO): string => {
    const participantId = getOtherParticipantId(conversation);
    if (!participantId) {
      return "Nepoznat korisnik";
    }

    return formatUserDisplayName(participantDirectory[participantId] ?? { username: participantId });
  };

  return (
    <div className="page-shell">
      <DashboardNavbar userAPI={userAPI} activePage="chat" />

      <main className="page-main" style={{ maxWidth: "1180px" }}>
        <section className="card page-hero page-hero-tight" style={{ marginBottom: "16px" }}>
          <div className="flex justify-between gap-3" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <h1>Poruke</h1>
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
            <h2 style={{ marginBottom: "16px" }}>Razgovori</h2>
            {isLoadingConversations ? <p>Ucavanje...</p> : null}
            {!isLoadingConversations && !conversations.length ? (
              <p style={{ marginBottom: 0 }}>Jos nemate nijedan razgovor.</p>
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
                      Sagovornik: {getOtherParticipantLabel(conversation)}
                    </p>
                    {conversation.lastMessage ? (
                      <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
                        {conversation.lastMessage.content}
                      </p>
                    ) : null}
                    {conversation.unreadCount ? (
                      <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
                        Neprocitano: {conversation.unreadCount}
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
                  <p style={{ marginBottom: 0 }}>Sagovornik: {getOtherParticipantLabel(selectedConversation)}</p>
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
                  {isLoadingMessages ? <p>Ucavanje poruka...</p> : null}
                  {!isLoadingMessages && !messages.length ? <p>Jos nema poruka.</p> : null}
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
                          background: isMine ? "var(--win11-accent)" : "var(--win11-surface-subtle)",
                          color: isMine ? "#fffdf8" : "var(--win11-text-primary)",
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
                    placeholder="Napisi poruku..."
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-accent" type="submit" disabled={!messageDraft.trim()}>
                    Posalji
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center" style={{ flex: 1 }}>
                <p style={{ marginBottom: 0 }}>Izaberite razgovor.</p>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
};
