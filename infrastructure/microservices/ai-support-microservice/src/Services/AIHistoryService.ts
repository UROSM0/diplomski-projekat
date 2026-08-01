import { AIMessageRole, Prisma, PrismaClient } from "@prisma/client";
import { AISourceDTO } from "../Domain/DTOs/AISourceDTO";
import { AIConversationDTO, AIMessageDTO } from "../Domain/DTOs/AIHistoryDTO";

export class AIHistoryService {
  private readonly perMinute = Number(process.env.AI_RATE_LIMIT_PER_MINUTE) || 5;
  private readonly perDay = Number(process.env.AI_RATE_LIMIT_PER_DAY) || 100;

  constructor(private readonly prisma: PrismaClient) {}

  async startExchange(userId: string, question: string, conversationId?: string) {
    if (!userId?.trim()) throw new Error("User id is required.");
    await this.enforceRateLimit(userId);
    let conversation = conversationId
      ? await this.prisma.aIConversation.findFirst({ where: { id: conversationId, userId } })
      : null;
    if (conversationId && !conversation) throw new Error("AI conversation not found.");
    conversation ??= await this.prisma.aIConversation.create({
      data: { userId, title: question.trim().slice(0, 80) },
    });
    const userMessage = await this.prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: AIMessageRole.USER, content: question.trim() },
    });
    await this.prisma.aIConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    return { conversation, userMessage };
  }

  async saveAssistantMessage(conversationId: string, content: string, model: string, sources: AISourceDTO[]) {
    const message = await this.prisma.aIMessage.create({
      data: { conversationId, role: AIMessageRole.ASSISTANT, content, model, sources: sources as unknown as Prisma.InputJsonValue },
    });
    await this.prisma.aIConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    return message;
  }

  async getConversations(userId: string): Promise<AIConversationDTO[]> {
    const items = await this.prisma.aIConversation.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
    return items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }));
  }

  async getMessages(userId: string, conversationId: string): Promise<AIMessageDTO[]> {
    const conversation = await this.prisma.aIConversation.findFirst({ where: { id: conversationId, userId } });
    if (!conversation) throw new Error("AI conversation not found.");
    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId }, include: { feedback: true }, orderBy: { createdAt: "asc" },
    });
    return messages.map((item) => ({
      id: item.id, conversationId: item.conversationId, role: item.role, content: item.content,
      model: item.model ?? undefined, sources: (item.sources as unknown as AISourceDTO[] | null) ?? [],
      helpful: item.feedback?.helpful, createdAt: item.createdAt.toISOString(),
    }));
  }

  async saveFeedback(userId: string, messageId: string, helpful: boolean, comment?: string): Promise<void> {
    const message = await this.prisma.aIMessage.findFirst({
      where: { id: messageId, role: AIMessageRole.ASSISTANT, conversation: { userId } },
    });
    if (!message) throw new Error("AI message not found.");
    await this.prisma.aIFeedback.upsert({
      where: { messageId },
      create: { messageId, userId, helpful, comment: comment?.trim() || null },
      update: { helpful, comment: comment?.trim() || null },
    });
  }

  private async enforceRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const [minuteCount, dayCount] = await Promise.all([
      this.prisma.aIMessage.count({ where: { role: AIMessageRole.USER, conversation: { userId }, createdAt: { gte: new Date(now - 60_000) } } }),
      this.prisma.aIMessage.count({ where: { role: AIMessageRole.USER, conversation: { userId }, createdAt: { gte: new Date(now - 86_400_000) } } }),
    ]);
    if (minuteCount >= this.perMinute) throw new Error("AI rate limit exceeded. Please wait before asking again.");
    if (dayCount >= this.perDay) throw new Error("Daily AI rate limit exceeded.");
  }
}
