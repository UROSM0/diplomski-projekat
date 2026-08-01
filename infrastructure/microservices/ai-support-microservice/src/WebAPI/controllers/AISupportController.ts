import { Request, Response, Router } from "express";
import { AIChatRequestDTO } from "../../Domain/DTOs/AIChatRequestDTO";
import { AIEmbeddingRequestDTO } from "../../Domain/DTOs/AIEmbeddingRequestDTO";
import { IAISupportService } from "../../Domain/services/IAISupportService";
import { IKnowledgeService } from "../../Domain/services/IKnowledgeService";
import { AIHistoryService } from "../../Services/AIHistoryService";

export class AISupportController {
  private readonly router = Router();

  constructor(
    private readonly aiSupportService: IAISupportService,
    private readonly knowledgeService: IKnowledgeService,
    private readonly historyService: AIHistoryService
  ) {
    this.router.get("/ai/health", this.getHealth.bind(this));
    this.router.get("/ai/knowledge/status", this.getKnowledgeStatus.bind(this));
    this.router.post("/ai/chat", this.chat.bind(this));
    this.router.post("/ai/chat/stream", this.streamChat.bind(this));
    this.router.get("/ai/users/:userId/conversations", this.getConversations.bind(this));
    this.router.get("/ai/conversations/:conversationId/messages", this.getMessages.bind(this));
    this.router.post("/ai/messages/:messageId/feedback", this.saveFeedback.bind(this));
    this.router.post("/ai/embeddings", this.createEmbedding.bind(this));
  }

  getRouter(): Router {
    return this.router;
  }

  private async getHealth(_req: Request, res: Response): Promise<void> {
    const health = await this.aiSupportService.getHealth();
    res.status(health.status === "available" ? 200 : 503).json(health);
  }

  private getKnowledgeStatus(_req: Request, res: Response): void {
    res.status(200).json(this.knowledgeService.getStatus());
  }

  private async chat(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as AIChatRequestDTO;
      const response = await this.knowledgeService.ask(data.question);
      res.status(200).json(response);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  private async createEmbedding(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as AIEmbeddingRequestDTO;
      const response = await this.aiSupportService.createEmbedding(data.input);
      res.status(200).json(response);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  private async streamChat(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as AIChatRequestDTO;
      const exchange = await this.historyService.startExchange(data.userId ?? "", data.question, data.conversationId);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(`event: conversation\ndata: ${JSON.stringify({
        conversationId: exchange.conversation.id,
        userMessageId: exchange.userMessage.id,
        title: exchange.conversation.title,
      })}\n\n`);
      let answer = "";
      const result = await this.knowledgeService.askStream(data.question, (token) => {
        answer += token;
        res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
      });
      const assistantMessage = await this.historyService.saveAssistantMessage(
        exchange.conversation.id, answer, result.model, result.sources
      );
      res.write(`event: sources\ndata: ${JSON.stringify({ sources: result.sources })}\n\n`);
      res.write(`event: done\ndata: ${JSON.stringify({
        model: result.model,
        conversationId: exchange.conversation.id,
        assistantMessageId: assistantMessage.id,
      })}\n\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI support request failed.";
      if (!res.headersSent) {
        this.sendError(res, error);
        return;
      }
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    } finally {
      if (!res.writableEnded) res.end();
    }
  }

  private async getConversations(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await this.historyService.getConversations(String(req.params.userId)));
    } catch (error) { this.sendError(res, error); }
  }

  private async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.query.userId ?? "");
      res.status(200).json(await this.historyService.getMessages(userId, String(req.params.conversationId)));
    } catch (error) { this.sendError(res, error); }
  }

  private async saveFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { userId, helpful, comment } = req.body as { userId?: string; helpful?: boolean; comment?: string };
      if (typeof helpful !== "boolean") throw new Error("Helpful value is required.");
      await this.historyService.saveFeedback(userId ?? "", String(req.params.messageId), helpful, comment);
      res.status(204).send();
    } catch (error) { this.sendError(res, error); }
  }

  private sendError(res: Response, error: unknown): void {
    const message = error instanceof Error ? error.message : "AI support request failed.";
    const isValidationError = /required|cannot exceed/i.test(message);
    const isUnavailable = /LM Studio|AI model|Embedding model/i.test(message);
    const isNotFound = /not found/i.test(message);
    const isRateLimited = /rate limit/i.test(message);
    res.status(isValidationError ? 400 : isNotFound ? 404 : isRateLimited ? 429 : isUnavailable ? 503 : 500).json({ message });
  }
}
