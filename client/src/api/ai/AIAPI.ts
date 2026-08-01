import { createApiError } from "../shared/apiError";
import { AISourceDTO } from "../../models/ai/AISourceDTO";
import { IAIAPI } from "./IAIAPI";
import { AIConversationDTO, AIMessageDTO } from "../../models/ai/AIHistoryDTO";

export class AIAPI implements IAIAPI {
  async streamQuestion(
    token: string,
    question: string,
    conversationId: string | undefined,
    handlers: {
      onToken: (token: string) => void; onSources: (sources: AISourceDTO[]) => void;
      onConversation: (conversationId: string) => void; onDone: (assistantMessageId: string) => void;
    }
  ): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_GATEWAY_URL}/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, conversationId }),
      });
      if (!response.ok || !response.body) {
        const error = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(error.message ?? "AI support request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const block of events) {
          const event = block.split("\n").find((line) => line.startsWith("event:"))?.slice(6).trim();
          const dataText = block.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim();
          if (!event || !dataText) continue;
          const data = JSON.parse(dataText) as {
            token?: string; sources?: AISourceDTO[]; message?: string;
            conversationId?: string; assistantMessageId?: string;
          };
          if (event === "conversation" && data.conversationId) handlers.onConversation(data.conversationId);
          if (event === "token" && data.token) handlers.onToken(data.token);
          if (event === "sources") handlers.onSources(data.sources ?? []);
          if (event === "done" && data.assistantMessageId) handlers.onDone(data.assistantMessageId);
          if (event === "error") throw new Error(data.message ?? "AI support request failed.");
        }
      }
    } catch (error) {
      throw createApiError(error, "AI support request failed.");
    }
  }

  async getConversations(token: string): Promise<AIConversationDTO[]> {
    return this.getJson<AIConversationDTO[]>("/ai/conversations", token);
  }

  async getMessages(token: string, conversationId: string): Promise<AIMessageDTO[]> {
    return this.getJson<AIMessageDTO[]>(`/ai/conversations/${conversationId}/messages`, token);
  }

  async saveFeedback(token: string, messageId: string, helpful: boolean): Promise<void> {
    const response = await fetch(`${import.meta.env.VITE_GATEWAY_URL}/ai/messages/${messageId}/feedback`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ helpful }),
    });
    if (!response.ok) throw new Error("Ocena odgovora nije sacuvana.");
  }

  private async getJson<T>(path: string, token: string): Promise<T> {
    const response = await fetch(`${import.meta.env.VITE_GATEWAY_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(error.message ?? "AI istorija nije dostupna.");
    }
    return response.json() as Promise<T>;
  }
}
