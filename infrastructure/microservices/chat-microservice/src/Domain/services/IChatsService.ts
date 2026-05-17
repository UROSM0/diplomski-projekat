import { ConversationDTO } from "../DTOs/ConversationDTO";
import { CreateConversationDTO } from "../DTOs/CreateConversationDTO";
import { CreateMessageDTO } from "../DTOs/CreateMessageDTO";
import { MessageDTO } from "../DTOs/MessageDTO";

export interface IChatsService {
  createOrGetConversation(data: CreateConversationDTO): Promise<ConversationDTO>;
  getConversations(userId: string): Promise<ConversationDTO[]>;
  getMessages(conversationId: string, userId: string): Promise<MessageDTO[]>;
  sendMessage(conversationId: string, data: CreateMessageDTO): Promise<MessageDTO>;
  markConversationAsRead(conversationId: string, userId: string): Promise<void>;
}
