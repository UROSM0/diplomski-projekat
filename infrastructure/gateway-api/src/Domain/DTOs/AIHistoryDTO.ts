import { AISourceDTO } from "./AISourceDTO";

export interface AIConversationDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessageDTO {
  id: string;
  conversationId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  model?: string;
  sources: AISourceDTO[];
  helpful?: boolean;
  createdAt: string;
}
