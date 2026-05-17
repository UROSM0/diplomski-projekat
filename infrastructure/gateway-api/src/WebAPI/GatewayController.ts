import { Request, Response, Router } from "express";
import { IGatewayService } from "../Domain/services/IGatewayService";
import { AddFavoriteDTO } from "../Domain/DTOs/AddFavoriteDTO";
import { CreateRatingDTO } from "../Domain/DTOs/CreateRatingDTO";
import { CreateAdDTO } from "../Domain/DTOs/CreateAdDTO";
import { CreateCategoryDTO } from "../Domain/DTOs/CreateCategoryDTO";
import { GetAdsQueryDTO } from "../Domain/DTOs/GetAdsQueryDTO";
import { LoginUserDTO } from "../Domain/DTOs/LoginUserDTO";
import { RegistrationUserDTO } from "../Domain/DTOs/RegistrationUserDTO";
import { PurchaseTransactionDTO } from "../Domain/DTOs/PurchaseTransactionDTO";
import { RefreshTokenDTO } from "../Domain/DTOs/RefreshTokenDTO";
import { ChangePasswordDTO } from "../Domain/DTOs/ChangePasswordDTO";
import { TopUpBalanceDTO } from "../Domain/DTOs/TopUpBalanceDTO";
import { ModerateAdDTO } from "../Domain/DTOs/ModerateAdDTO";
import { UpdateUserAccessDTO } from "../Domain/DTOs/UpdateUserAccessDTO";
import { UpdateAdDTO } from "../Domain/DTOs/UpdateAdDTO";
import { UpdateUserProfileDTO } from "../Domain/DTOs/UpdateUserProfileDTO";
import { CreateConversationDTO } from "../Domain/DTOs/CreateConversationDTO";
import { CreateMessageDTO } from "../Domain/DTOs/CreateMessageDTO";
import { GetAuditLogsQueryDTO } from "../Domain/DTOs/GetAuditLogsQueryDTO";
import { GetNotificationsQueryDTO } from "../Domain/DTOs/GetNotificationsQueryDTO";
import { authenticate } from "../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../Middlewares/authorization/AuthorizeMiddleware";
import { adImagesUploadMiddleware } from "./uploads/AdImageUpload";

export class GatewayController {
  private readonly router: Router;

  constructor(private readonly gatewayService: IGatewayService) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Auth
    this.router.post("/login", this.login.bind(this));
    this.router.post("/register", this.register.bind(this));
    this.router.post("/refresh", this.refresh.bind(this));
    this.router.post("/logout", this.logout.bind(this));

    // Users
    this.router.get("/users", authenticate, authorize("admin"), this.getAllUsers.bind(this));
    this.router.get("/users/me", authenticate, authorize("admin", "manager", "user"), this.getCurrentUser.bind(this));
    this.router.patch("/users/me", authenticate, authorize("admin", "manager", "user"), this.updateCurrentUser.bind(this));
    this.router.post("/users/me/change-password", authenticate, authorize("admin", "manager", "user"), this.changeCurrentUserPassword.bind(this));
    this.router.post("/users/me/top-up", authenticate, authorize("admin", "manager", "user"), this.topUpCurrentUser.bind(this));
    this.router.get("/users/me/favorites", authenticate, authorize("admin", "manager", "user"), this.getCurrentUserFavorites.bind(this));
    this.router.post("/users/me/favorites", authenticate, authorize("admin", "manager", "user"), this.addCurrentUserFavorite.bind(this));
    this.router.delete("/users/me/favorites/:adId", authenticate, authorize("admin", "manager", "user"), this.removeCurrentUserFavorite.bind(this));
    this.router.get("/users/me/notifications", authenticate, authorize("admin", "manager", "user"), this.getCurrentUserNotifications.bind(this));
    this.router.patch("/users/me/notifications/:id/read", authenticate, authorize("admin", "manager", "user"), this.markCurrentUserNotificationAsRead.bind(this));
    this.router.post("/users/me/notifications/mark-all-read", authenticate, authorize("admin", "manager", "user"), this.markAllCurrentUserNotificationsAsRead.bind(this));
    this.router.get("/users/:id", authenticate, authorize("admin", "manager", "user"), this.getUserById.bind(this));
    this.router.patch("/users/:id/access", authenticate, authorize("admin"), this.updateUserAccess.bind(this));

    // Categories
    this.router.get("/categories", this.getCategories.bind(this));
    this.router.post("/categories", authenticate, authorize("admin"), this.createCategory.bind(this));

    // Ads
    this.router.get("/ads", this.getPublicAds.bind(this));
    this.router.get("/ads/review", authenticate, authorize("admin", "manager"), this.getAdsForModeration.bind(this));
    this.router.get("/ads/me", authenticate, authorize("admin", "manager", "user"), this.getMyAds.bind(this));
    this.router.get("/ads/:id", this.getPublicAdById.bind(this));
    this.router.post("/ads", authenticate, authorize("admin", "manager", "user"), adImagesUploadMiddleware, this.createAd.bind(this));
    this.router.patch("/ads/:id", authenticate, authorize("admin", "manager", "user"), adImagesUploadMiddleware, this.updateAd.bind(this));
    this.router.delete("/ads/:id", authenticate, authorize("admin", "manager", "user"), this.deleteAd.bind(this));
    this.router.patch("/ads/:id/moderation", authenticate, authorize("admin", "manager"), this.moderateAd.bind(this));

    // Transactions
    this.router.post("/transactions/purchase", authenticate, authorize("admin", "manager", "user"), this.purchaseAd.bind(this));
    this.router.get("/transactions/me/purchases", authenticate, authorize("admin", "manager", "user"), this.getMyPurchases.bind(this));
    this.router.get("/transactions/me/sales", authenticate, authorize("admin", "manager", "user"), this.getMySales.bind(this));
    this.router.post("/transactions/:id/rating", authenticate, authorize("admin", "manager", "user"), this.rateTransaction.bind(this));

    // Chat
    this.router.post("/chat/conversations", authenticate, authorize("admin", "manager", "user"), this.createOrGetConversation.bind(this));
    this.router.get("/chat/conversations", authenticate, authorize("admin", "manager", "user"), this.getConversations.bind(this));
    this.router.get("/chat/conversations/:id/messages", authenticate, authorize("admin", "manager", "user"), this.getMessages.bind(this));
    this.router.post("/chat/conversations/:id/messages", authenticate, authorize("admin", "manager", "user"), this.sendMessage.bind(this));
    this.router.patch("/chat/conversations/:id/read", authenticate, authorize("admin", "manager", "user"), this.markConversationAsRead.bind(this));

    // Audit
    this.router.get("/audit/logs", authenticate, authorize("admin"), this.getAuditLogs.bind(this));
  }

  // Auth
  private async login(req: Request, res: Response): Promise<void> {
    const data: LoginUserDTO = req.body;
    const result = await this.gatewayService.login(data);
    res.status(result.success ? 200 : 401).json(result);
  }

  private async register(req: Request, res: Response): Promise<void> {
    const data: RegistrationUserDTO = req.body;
    const result = await this.gatewayService.register(data);
    res.status(result.success ? 201 : 400).json(result);
  }

  private async refresh(req: Request, res: Response): Promise<void> {
    const data: RefreshTokenDTO = req.body;
    const result = await this.gatewayService.refresh(data);
    res.status(result.success ? 200 : 401).json(result);
  }

  private async logout(req: Request, res: Response): Promise<void> {
    const data: RefreshTokenDTO = req.body;
    const result = await this.gatewayService.logout(data);
    res.status(result.success ? 200 : 400).json(result);
  }

  // Users
  private async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await this.gatewayService.getAllUsers();
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }

  private async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const user = await this.gatewayService.getUserById(req.user.id);
      res.status(200).json(user);
    } catch (err) {
      res.status(404).json({ message: (err as Error).message });
    }
  }

  private async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id || !req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      if (req.user.role.toLowerCase() !== "admin" && req.user.id !== id) {
        res.status(401).json({ message: "You can only access your own data!" });
        return;
      }

      const user = await this.gatewayService.getUserById(id);
      res.status(200).json(user);
    } catch (err) {
      res.status(404).json({ message: (err as Error).message });
    }
  }

  private async updateCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const data = req.body as UpdateUserProfileDTO;
      const user = await this.gatewayService.updateUserProfile(req.user.id, data);
      res.status(200).json(user);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async changeCurrentUserPassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const data = req.body as ChangePasswordDTO;
      const result = await this.gatewayService.changePassword(req.user.id, data);
      res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async topUpCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const data = req.body as TopUpBalanceDTO;
      const user = await this.gatewayService.topUpBalance(req.user.id, data);
      res.status(200).json(user);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getCurrentUserFavorites(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const favorites = await this.gatewayService.getFavorites(req.user.id);
      res.status(200).json(favorites);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async addCurrentUserFavorite(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const data = req.body as AddFavoriteDTO;
      const favorite = await this.gatewayService.addFavorite(req.user.id, data);
      res.status(201).json(favorite);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async removeCurrentUserFavorite(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const adId = this.getSingleValue(req.params.adId);
      if (!adId) {
        res.status(400).json({ message: "Invalid ad id." });
        return;
      }

      await this.gatewayService.removeFavorite(req.user.id, adId);
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getCurrentUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const query: GetNotificationsQueryDTO = {
        unreadOnly: this.toBoolean(this.getSingleValue(req.query.unreadOnly)),
      };
      const notifications = await this.gatewayService.getNotifications(req.user.id, query);
      res.status(200).json(notifications);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async markCurrentUserNotificationAsRead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const id = this.getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid notification id." });
        return;
      }

      const notification = await this.gatewayService.markNotificationAsRead(req.user.id, id);
      res.status(200).json(notification);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async markAllCurrentUserNotificationsAsRead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      await this.gatewayService.markAllNotificationsAsRead(req.user.id);
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async updateUserAccess(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id?.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      if (req.user.id === id) {
        res.status(400).json({ message: "You cannot change your own role or status." });
        return;
      }

      const data = req.body as UpdateUserAccessDTO;
      const user = await this.gatewayService.updateUserAccess(id, data);
      res.status(200).json(user);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.gatewayService.getCategories();
      res.status(200).json(categories);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }

  private async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as CreateCategoryDTO;
      const category = await this.gatewayService.createCategory(data);
      res.status(201).json(category);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getPublicAds(req: Request, res: Response): Promise<void> {
    try {
      const query = this.toAdsQueryDTO(req);
      const ads = await this.gatewayService.getPublicAds(query);
      res.status(200).json(ads);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getAdsForModeration(req: Request, res: Response): Promise<void> {
    try {
      const query = this.toAdsQueryDTO(req);
      const ads = await this.gatewayService.getAdsForModeration(query);
      res.status(200).json(ads);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getPublicAdById(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid ad id." });
        return;
      }

      const ad = await this.gatewayService.getPublicAdById(id);
      res.status(200).json(ad);
    } catch (err) {
      res.status(404).json({ message: (err as Error).message });
    }
  }

  private async getMyAds(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const query = this.toAdsQueryDTO(req);
      const ads = await this.gatewayService.getMyAds(req.user.id, query);
      res.status(200).json(ads);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async createAd(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const data = this.toCreateAdDTO(req.body);
      const files = Array.isArray(req.files) ? req.files : [];
      const ad = await this.gatewayService.createAd(req.user.id, data, files);
      res.status(201).json(ad);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async updateAd(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const id = this.getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid ad id." });
        return;
      }

      const data = this.toUpdateAdDTO(req.body);
      const files = Array.isArray(req.files) ? req.files : [];
      const ad = await this.gatewayService.updateAd(id, req.user.id, data, files);
      res.status(200).json(ad);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async deleteAd(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const id = this.getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid ad id." });
        return;
      }

      await this.gatewayService.deleteAd(id, req.user.id);
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async moderateAd(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const id = this.getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid ad id." });
        return;
      }

      const data = req.body as ModerateAdDTO;
      const ad = await this.gatewayService.moderateAd(id, req.user.id, data);
      res.status(200).json(ad);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async purchaseAd(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const data = req.body as PurchaseTransactionDTO;
      const transaction = await this.gatewayService.purchaseAd(req.user.id, data);
      res.status(201).json(transaction);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getMyPurchases(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const transactions = await this.gatewayService.getPurchases(req.user.id);
      res.status(200).json(transactions);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getMySales(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const transactions = await this.gatewayService.getSales(req.user.id);
      res.status(200).json(transactions);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async rateTransaction(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const id = this.getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid transaction id." });
        return;
      }

      const data = req.body as CreateRatingDTO;
      const transaction = await this.gatewayService.rateTransaction(id, req.user.id, data);
      res.status(200).json(transaction);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async createOrGetConversation(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const data = req.body as CreateConversationDTO;
      const conversation = await this.gatewayService.createOrGetConversation(req.user.id, data);
      res.status(201).json(conversation);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getConversations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const conversations = await this.gatewayService.getConversations(req.user.id);
      res.status(200).json(conversations);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getMessages(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const id = this.getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid conversation id." });
        return;
      }

      const messages = await this.gatewayService.getMessages(id, req.user.id);
      res.status(200).json(messages);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const id = this.getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid conversation id." });
        return;
      }

      const data = req.body as CreateMessageDTO;
      const message = await this.gatewayService.sendMessage(id, req.user.id, data);
      res.status(201).json(message);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async markConversationAsRead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
      }

      const id = this.getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid conversation id." });
        return;
      }

      await this.gatewayService.markConversationAsRead(id, req.user.id);
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const query: GetAuditLogsQueryDTO = {
        page: this.toNumber(req.query.page),
        limit: this.toNumber(req.query.limit),
        userId: this.getSingleValue(req.query.userId),
        action: this.getSingleValue(req.query.action),
        service: this.getSingleValue(req.query.service),
        dateFrom: this.getSingleValue(req.query.dateFrom),
        dateTo: this.getSingleValue(req.query.dateTo),
      };

      const logs = await this.gatewayService.getAuditLogs(query);
      res.status(200).json(logs);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private toAdsQueryDTO(req: Request): GetAdsQueryDTO {
    return {
      page: this.toNumber(req.query.page),
      limit: this.toNumber(req.query.limit),
      search: this.getSingleValue(req.query.search),
      categoryId: this.getSingleValue(req.query.categoryId),
      status: this.getSingleValue(req.query.status),
    };
  }

  private toCreateAdDTO(body: unknown): CreateAdDTO {
    const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

    return {
      title: this.getSingleValue(payload.title) ?? "",
      description: this.getSingleValue(payload.description) ?? "",
      price: this.toNumber(payload.price) ?? Number.NaN,
      categoryId: this.getSingleValue(payload.categoryId) ?? "",
    };
  }

  private toUpdateAdDTO(body: unknown): UpdateAdDTO {
    const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

    return {
      title: this.getSingleValue(payload.title),
      description: this.getSingleValue(payload.description),
      price: this.toNumber(payload.price),
      categoryId: this.getSingleValue(payload.categoryId),
      removeExistingImages: this.toBoolean(this.getSingleValue(payload.removeExistingImages)),
    };
  }

  private toBoolean(value?: string): boolean | undefined {
    if (!value) {
      return undefined;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return undefined;
  }

  private getSingleValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return typeof value[0] === "string" ? value[0] : undefined;
    }

    return typeof value === "string" ? value : undefined;
  }

  private toNumber(value: unknown): number | undefined {
    const normalized = this.getSingleValue(value);
    if (!normalized) return undefined;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  public getRouter(): Router {
    return this.router;
  }
}
