import React, { useEffect, useState } from "react";
import { IAIAPI } from "../api/ai/IAIAPI";
import { getErrorMessage } from "../api/shared/apiError";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { AISourceDTO } from "../models/ai/AISourceDTO";
import { AIConversationDTO } from "../models/ai/AIHistoryDTO";

type Message = { id: string; role: "user" | "assistant"; content: string; sources?: AISourceDTO[]; helpful?: boolean };
type AISupportPageProps = { aiAPI: IAIAPI; userAPI: IUserAPI };

const suggestions = [
  "Kako da postavim novi oglas?",
  "Zasto moj oglas jos nije vidljiv?",
  "Kako funkcionise kupovina oglasa?",
  "Kada mogu da ocenim drugog korisnika?",
];

export const AISupportPage: React.FC<AISupportPageProps> = ({ aiAPI, userAPI }) => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pageError, setPageError] = useState("");
  const [conversations, setConversations] = useState<AIConversationDTO[]>([]);
  const [conversationId, setConversationId] = useState<string>();

  const refreshConversations = async () => {
    if (!token) return;
    setConversations(await aiAPI.getConversations(token));
  };

  useEffect(() => { void refreshConversations().catch(() => undefined); }, [token]);

  const openConversation = async (id: string) => {
    if (!token || isGenerating) return;
    setConversationId(id);
    const history = await aiAPI.getMessages(token, id);
    setMessages(history.map((message) => ({
      id: message.id, role: message.role === "USER" ? "user" : "assistant",
      content: message.content, sources: message.sources, helpful: message.helpful,
    })));
  };

  const newConversation = () => { if (!isGenerating) { setConversationId(undefined); setMessages([]); setPageError(""); } };

  const ask = async (questionValue: string) => {
    const question = questionValue.trim();
    if (!token || !question || isGenerating) return;
    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: question },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setDraft("");
    setPageError("");
    setIsGenerating(true);
    try {
      await aiAPI.streamQuestion(token, question, conversationId, {
        onConversation: (id) => { setConversationId(id); void refreshConversations(); },
        onToken: (nextToken) => setMessages((current) => current.map((message) =>
          message.id === assistantId ? { ...message, content: message.content + nextToken } : message
        )),
        onSources: (sources) => setMessages((current) => current.map((message) =>
          message.id === assistantId
            ? { ...message, sources: message.content.toLowerCase().includes("nemam dovoljno informacija") ? [] : sources }
            : message
        )),
        onDone: (messageId) => {
          setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, id: messageId } : message));
          void refreshConversations();
        },
      });
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== assistantId));
      setPageError(getErrorMessage(error, "AI podrska trenutno nije dostupna."));
    } finally {
      setIsGenerating(false);
    }
  };

  const rate = async (messageId: string, helpful: boolean) => {
    if (!token) return;
    try {
      await aiAPI.saveFeedback(token, messageId, helpful);
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, helpful } : message));
    } catch (error) { setPageError(getErrorMessage(error, "Ocena odgovora nije sacuvana.")); }
  };

  return (
    <div className="page-shell">
      <DashboardNavbar userAPI={userAPI} activePage="ai-support" />
      <main className="page-main" style={{ maxWidth: "1000px" }}>
        <section className="card page-hero page-hero-tight" style={{ marginBottom: "16px" }}>
          <h1 style={{ marginBottom: "8px" }}>AI podrska</h1>
          <p style={{ marginBottom: 0, color: "var(--win11-text-secondary)" }}>
            Pitaj kako se koristi aplikacija ili koja pravila vaze. Odgovori se zasnivaju na dokumentaciji sajta.
          </p>
        </section>

        <section className="card" style={{ minHeight: "560px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select
              value={conversationId ?? ""}
              onChange={(event) => event.target.value ? void openConversation(event.target.value) : newConversation()}
              disabled={isGenerating}
              aria-label="Prethodni AI razgovori"
              style={{ flex: 1 }}
            >
              <option value="">Novi razgovor</option>
              {conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title}</option>)}
            </select>
            <button type="button" className="btn btn-ghost" onClick={newConversation} disabled={isGenerating}>Novi razgovor</button>
          </div>
          {!messages.length ? (
            <div style={{ margin: "auto", width: "100%", maxWidth: "720px", textAlign: "center" }}>
              <div style={{ fontSize: "42px", marginBottom: "12px" }}>✦</div>
              <h2>Kako mogu da pomognem?</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px", marginTop: "22px" }}>
                {suggestions.map((suggestion) => (
                  <button key={suggestion} className="btn btn-ghost" type="button" onClick={() => void ask(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
              {messages.map((message) => (
                <article
                  key={message.id}
                  style={{
                    alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "82%",
                    padding: "14px 16px",
                    borderRadius: "16px",
                    background: message.role === "user" ? "var(--win11-accent)" : "rgba(255,255,255,0.055)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: "6px" }}>
                    {message.role === "user" ? "Ti" : "AI podrska"}
                  </strong>
                  <span>{message.content || (isGenerating ? "Razmisljam..." : "")}</span>
                  {message.sources?.length ? (
                    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                      <small style={{ color: "var(--win11-text-secondary)" }}>
                        Izvori: {message.sources.map((source) => source.title).join(" · ")}
                      </small>
                    </div>
                  ) : null}
                  {message.role === "assistant" && message.content && !isGenerating ? (
                    <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                      <small style={{ color: "var(--win11-text-secondary)" }}>Da li je odgovor bio koristan?</small>
                      <button type="button" className="btn btn-ghost" aria-label="Koristan odgovor" onClick={() => void rate(message.id, true)} style={{ padding: "4px 9px", opacity: message.helpful === true ? 1 : 0.65 }}>Da</button>
                      <button type="button" className="btn btn-ghost" aria-label="Nekoristan odgovor" onClick={() => void rate(message.id, false)} style={{ padding: "4px 9px", opacity: message.helpful === false ? 1 : 0.65 }}>Ne</button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          {pageError ? <div className="status-banner status-banner-error">{pageError}</div> : null}
          <form onSubmit={(event) => { event.preventDefault(); void ask(draft); }} style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Postavi pitanje o aplikaciji..."
              maxLength={1000}
              rows={2}
              disabled={isGenerating}
              style={{ resize: "none", flex: 1 }}
            />
            <button className="btn btn-accent" type="submit" disabled={isGenerating || !draft.trim()}>
              {isGenerating ? "Odgovaram..." : "Posalji"}
            </button>
          </form>
          <small style={{ color: "var(--win11-text-tertiary)", textAlign: "center" }}>
            AI moze da pogresi. Za vazne odluke proveri prikazana pravila i stanje u aplikaciji.
          </small>
        </section>
      </main>
    </div>
  );
};
