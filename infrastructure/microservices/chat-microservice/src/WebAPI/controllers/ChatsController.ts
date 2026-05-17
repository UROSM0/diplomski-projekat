import { Request, Response, Router } from "express";
import { CreateConversationDTO } from "../../Domain/DTOs/CreateConversationDTO";
import { CreateMessageDTO } from "../../Domain/DTOs/CreateMessageDTO";
import { IChatsService } from "../../Domain/services/IChatsService";
import { ILogerService } from "../../Domain/services/ILogerService";

export class ChatsController {
  private readonly router: Router;

  constructor(
    private readonly chatsService: IChatsService,
    private readonly logger: ILogerService
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/conversations", this.createOrGetConversation.bind(this));
    this.router.get("/conversations/:id", this.getConversationById.bind(this));
    this.router.get("/users/:userId/conversations", this.getConversations.bind(this));
    this.router.get("/conversations/:id/messages", this.getMessages.bind(this));
    this.router.post("/conversations/:id/messages", this.sendMessage.bind(this));
    this.router.patch("/conversations/:id/read", this.markAsRead.bind(this));
  }

  private async createOrGetConversation(req: Request, res: Response): Promise<void> {
    try {
      const conversation = await this.chatsService.createOrGetConversation(req.body as CreateConversationDTO);
      res.status(201).json(conversation);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.getSingleValue(req.params.userId);
      if (!userId) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      const conversations = await this.chatsService.getConversations(userId);
      res.status(200).json(conversations);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getConversationById(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleValue(req.params.id);
      const userId = this.getSingleValue(req.query.userId);
      if (!id || !userId) {
        res.status(400).json({ message: "Conversation id and user id are required." });
        return;
      }

      const conversation = await this.chatsService.getConversationById(id, userId);
      res.status(200).json(conversation);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleValue(req.params.id);
      const userId = this.getSingleValue(req.query.userId);
      if (!id || !userId) {
        res.status(400).json({ message: "Conversation id and user id are required." });
        return;
      }

      const messages = await this.chatsService.getMessages(id, userId);
      res.status(200).json(messages);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid conversation id." });
        return;
      }

      const message = await this.chatsService.sendMessage(id, req.body as CreateMessageDTO);
      res.status(201).json(message);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleValue(req.params.id);
      const userId = this.getSingleValue(req.body?.userId);
      if (!id || !userId) {
        res.status(400).json({ message: "Conversation id and user id are required." });
        return;
      }

      await this.chatsService.markConversationAsRead(id, userId);
      res.status(204).send();
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private getSingleValue(value: unknown): string | null {
    if (Array.isArray(value)) {
      return typeof value[0] === "string" && value[0].trim() ? value[0] : null;
    }

    return typeof value === "string" && value.trim() ? value : null;
  }

  public getRouter(): Router {
    return this.router;
  }
}
