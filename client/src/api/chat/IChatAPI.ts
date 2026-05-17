import { ConversationDTO } from "../../models/chat/ConversationDTO";
import { CreateConversationDTO } from "../../models/chat/CreateConversationDTO";
import { CreateMessageDTO } from "../../models/chat/CreateMessageDTO";
import { MessageDTO } from "../../models/chat/MessageDTO";

export interface IChatAPI {
  createOrGetConversation(token: string, data: CreateConversationDTO): Promise<ConversationDTO>;
  getConversations(token: string): Promise<ConversationDTO[]>;
  getMessages(token: string, conversationId: string): Promise<MessageDTO[]>;
  sendMessage(token: string, conversationId: string, data: CreateMessageDTO): Promise<MessageDTO>;
  markConversationAsRead(token: string, conversationId: string): Promise<void>;
}
