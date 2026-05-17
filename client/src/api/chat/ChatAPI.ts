import axios, { AxiosInstance } from "axios";
import { ConversationDTO } from "../../models/chat/ConversationDTO";
import { CreateConversationDTO } from "../../models/chat/CreateConversationDTO";
import { CreateMessageDTO } from "../../models/chat/CreateMessageDTO";
import { MessageDTO } from "../../models/chat/MessageDTO";
import { IChatAPI } from "./IChatAPI";

export class ChatAPI implements IChatAPI {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_GATEWAY_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async createOrGetConversation(token: string, data: CreateConversationDTO): Promise<ConversationDTO> {
    return (
      await this.axiosInstance.post<ConversationDTO>("/chat/conversations", data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async getConversations(token: string): Promise<ConversationDTO[]> {
    return (
      await this.axiosInstance.get<ConversationDTO[]>("/chat/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async getMessages(token: string, conversationId: string): Promise<MessageDTO[]> {
    return (
      await this.axiosInstance.get<MessageDTO[]>(`/chat/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async sendMessage(token: string, conversationId: string, data: CreateMessageDTO): Promise<MessageDTO> {
    return (
      await this.axiosInstance.post<MessageDTO>(`/chat/conversations/${conversationId}/messages`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async markConversationAsRead(token: string, conversationId: string): Promise<void> {
    await this.axiosInstance.patch(
      `/chat/conversations/${conversationId}/read`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }
}
