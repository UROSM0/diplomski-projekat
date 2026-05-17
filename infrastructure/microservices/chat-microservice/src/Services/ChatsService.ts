import { Conversation, Message, PrismaClient } from "@prisma/client";
import { ConversationDTO } from "../Domain/DTOs/ConversationDTO";
import { CreateConversationDTO } from "../Domain/DTOs/CreateConversationDTO";
import { CreateMessageDTO } from "../Domain/DTOs/CreateMessageDTO";
import { MessageDTO } from "../Domain/DTOs/MessageDTO";
import { IChatsService } from "../Domain/services/IChatsService";

type ConversationWithLastMessage = Conversation & {
  messages: Message[];
};

export class ChatsService implements IChatsService {
  constructor(private readonly prisma: PrismaClient) {}

  async createOrGetConversation(data: CreateConversationDTO): Promise<ConversationDTO> {
    this.validateConversationPayload(data);

    if (data.requesterId === data.participantId) {
      throw new Error("You cannot start a conversation with yourself.");
    }

    const [participantOneId, participantTwoId] = this.normalizeParticipants(
      data.requesterId,
      data.participantId
    );

    const conversation = await this.prisma.conversation.upsert({
      where: {
        adId_participantOneId_participantTwoId: {
          adId: data.adId,
          participantOneId,
          participantTwoId,
        },
      },
      update: {
        adTitle: data.adTitle.trim(),
      },
      create: {
        adId: data.adId,
        adTitle: data.adTitle.trim(),
        participantOneId,
        participantTwoId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return this.toConversationDTO(conversation, data.requesterId);
  }

  async getConversations(userId: string): Promise<ConversationDTO[]> {
    if (!userId?.trim()) {
      throw new Error("User id is required.");
    }

    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participantOneId: userId }, { participantTwoId: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const unreadCounts = await this.getUnreadCounts(userId, conversations.map((item) => item.id));

    return conversations.map((conversation) =>
      this.toConversationDTO(conversation, userId, unreadCounts.get(conversation.id) ?? 0)
    );
  }

  async getMessages(conversationId: string, userId: string): Promise<MessageDTO[]> {
    await this.ensureParticipant(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return messages.map((message) => this.toMessageDTO(message));
  }

  async sendMessage(conversationId: string, data: CreateMessageDTO): Promise<MessageDTO> {
    await this.ensureParticipant(conversationId, data.senderId);

    const content = data.content?.trim();
    if (!content) {
      throw new Error("Message content is required.");
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: data.senderId,
        content,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return this.toMessageDTO(message);
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    await this.ensureParticipant(conversationId, userId);

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  private validateConversationPayload(data: CreateConversationDTO): void {
    if (!data.requesterId?.trim()) throw new Error("Requester id is required.");
    if (!data.participantId?.trim()) throw new Error("Participant id is required.");
    if (!data.adId?.trim()) throw new Error("Ad id is required.");
    if (!data.adTitle?.trim()) throw new Error("Ad title is required.");
  }

  private normalizeParticipants(firstUserId: string, secondUserId: string): [string, string] {
    return [firstUserId, secondUserId].sort() as [string, string];
  }

  private async ensureParticipant(conversationId: string, userId: string): Promise<Conversation> {
    if (!conversationId?.trim() || !userId?.trim()) {
      throw new Error("Conversation id and user id are required.");
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new Error("You can only access your own conversations.");
    }

    return conversation;
  }

  private async getUnreadCounts(userId: string, conversationIds: string[]): Promise<Map<string, number>> {
    if (!conversationIds.length) {
      return new Map();
    }

    const groupedCounts = await this.prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        isRead: false,
      },
      _count: { _all: true },
    });

    return new Map(groupedCounts.map((item) => [item.conversationId, item._count._all]));
  }

  private toConversationDTO(
    conversation: ConversationWithLastMessage,
    userId: string,
    unreadCount = 0
  ): ConversationDTO {
    return {
      id: conversation.id,
      adId: conversation.adId,
      adTitle: conversation.adTitle,
      participantOneId: conversation.participantOneId,
      participantTwoId: conversation.participantTwoId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      lastMessage: conversation.messages[0] ? this.toMessageDTO(conversation.messages[0]) : null,
      unreadCount,
    };
  }

  private toMessageDTO(message: Message): MessageDTO {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
