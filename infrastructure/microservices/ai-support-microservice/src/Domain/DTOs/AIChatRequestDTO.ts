export interface AIChatRequestDTO {
  question: string;
  context?: string[];
  userId?: string;
  conversationId?: string;
}
