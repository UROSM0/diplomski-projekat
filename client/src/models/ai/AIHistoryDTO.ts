import { AISourceDTO } from "./AISourceDTO";

export type AIConversationDTO = { id: string; title: string; createdAt: string; updatedAt: string };
export type AIMessageDTO = {
  id: string; conversationId: string; role: "USER" | "ASSISTANT"; content: string;
  model?: string; sources: AISourceDTO[]; helpful?: boolean; createdAt: string;
};
