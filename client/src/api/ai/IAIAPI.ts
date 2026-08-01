import { AISourceDTO } from "../../models/ai/AISourceDTO";
import { AIConversationDTO, AIMessageDTO } from "../../models/ai/AIHistoryDTO";

export interface IAIAPI {
  streamQuestion(
    token: string,
    question: string,
    conversationId: string | undefined,
    handlers: {
      onToken: (token: string) => void;
      onSources: (sources: AISourceDTO[]) => void;
      onConversation: (conversationId: string) => void;
      onDone: (assistantMessageId: string) => void;
    }
  ): Promise<void>;
  getConversations(token: string): Promise<AIConversationDTO[]>;
  getMessages(token: string, conversationId: string): Promise<AIMessageDTO[]>;
  saveFeedback(token: string, messageId: string, helpful: boolean): Promise<void>;
}
