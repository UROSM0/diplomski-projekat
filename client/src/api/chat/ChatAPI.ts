import axios, { AxiosInstance } from "axios";
import { ConversationDTO } from "../../models/chat/ConversationDTO";
import { CreateConversationDTO } from "../../models/chat/CreateConversationDTO";
import { CreateMessageDTO } from "../../models/chat/CreateMessageDTO";
import { MessageDTO } from "../../models/chat/MessageDTO";
import { IChatAPI } from "./IChatAPI";
import { createApiError } from "../shared/apiError";

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
    try {
      return (
        await this.axiosInstance.post<ConversationDTO>("/chat/conversations", data, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to start chat.");
    }
  }

  async getConversations(token: string): Promise<ConversationDTO[]> {
    try {
      return (
        await this.axiosInstance.get<ConversationDTO[]>("/chat/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to load conversations.");
    }
  }

  async getMessages(token: string, conversationId: string): Promise<MessageDTO[]> {
    try {
      return (
        await this.axiosInstance.get<MessageDTO[]>(`/chat/conversations/${conversationId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to load messages.");
    }
  }

  async sendMessage(token: string, conversationId: string, data: CreateMessageDTO): Promise<MessageDTO> {
    try {
      return (
        await this.axiosInstance.post<MessageDTO>(`/chat/conversations/${conversationId}/messages`, data, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to send message.");
    }
  }

  async markConversationAsRead(token: string, conversationId: string): Promise<void> {
    try {
      await this.axiosInstance.patch(
        `/chat/conversations/${conversationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      throw createApiError(error, "Failed to load messages.");
    }
  }
}
