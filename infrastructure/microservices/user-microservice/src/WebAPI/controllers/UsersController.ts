import { Router, Request, Response } from "express";
import { AddFavoriteDTO } from "../../Domain/DTOs/AddFavoriteDTO";
import { AdjustBalanceDTO } from "../../Domain/DTOs/AdjustBalanceDTO";
import { CreateNotificationDTO } from "../../Domain/DTOs/CreateNotificationDTO";
import { CreateUserDTO } from "../../Domain/DTOs/CreateUserDTO";
import { GetNotificationsQueryDTO } from "../../Domain/DTOs/GetNotificationsQueryDTO";
import { TopUpBalanceDTO } from "../../Domain/DTOs/TopUpBalanceDTO";
import { UpdateUserAccessDTO } from "../../Domain/DTOs/UpdateUserAccessDTO";
import { UpdateUserProfileDTO } from "../../Domain/DTOs/UpdateUserProfileDTO";
import { ILogerService } from "../../Domain/services/ILogerService";
import { IUsersService } from "../../Domain/services/IUsersService";

export class UsersController {
  private readonly router: Router;

  constructor(
    private readonly usersService: IUsersService,
    private readonly logger: ILogerService
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/internal/users", this.createUser.bind(this));
    this.router.post("/internal/users/:id/balance-adjustment", this.adjustBalance.bind(this));
    this.router.get("/users", this.getAllUsers.bind(this));
    this.router.get("/users/:id", this.getUserById.bind(this));
    this.router.get("/users/:id/favorites", this.getFavorites.bind(this));
    this.router.post("/users/:id/favorites", this.addFavorite.bind(this));
    this.router.delete("/users/:id/favorites/:adId", this.removeFavorite.bind(this));
    this.router.get("/users/:id/notifications", this.getNotifications.bind(this));
    this.router.post("/users/:id/notifications", this.createNotification.bind(this));
    this.router.post("/users/:id/notifications/mark-all-read", this.markAllNotificationsAsRead.bind(this));
    this.router.patch("/users/:id/notifications/:notificationId/read", this.markNotificationAsRead.bind(this));
    this.router.patch("/users/:id/access", this.updateUserAccess.bind(this));
    this.router.patch("/users/:id/profile", this.updateUserProfile.bind(this));
    this.router.post("/users/:id/top-up", this.topUpBalance.bind(this));
  }

  private async createUser(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as CreateUserDTO;
      const user = await this.usersService.createUser(data);
      res.status(201).json(user);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      this.logger.log("Fetching all users");
      const users = await this.usersService.getAllUsers();
      res.status(200).json(users);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(500).json({ message: (err as Error).message });
    }
  }

  private async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !id.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }
      this.logger.log(`Fetching user with ID ${id}`);
      const user = await this.usersService.getUserById(id);
      res.status(200).json(user);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(404).json({ message: (err as Error).message });
    }
  }

  private async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !id.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      const data = req.body as UpdateUserProfileDTO;
      const user = await this.usersService.updateUserProfile(id, data);
      res.status(200).json(user);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getFavorites(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !id.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      const favorites = await this.usersService.getFavorites(id);
      res.status(200).json(favorites);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async addFavorite(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !id.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      const data = req.body as AddFavoriteDTO;
      const favorite = await this.usersService.addFavorite(id, data);
      res.status(201).json(favorite);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async removeFavorite(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const adId = Array.isArray(req.params.adId) ? req.params.adId[0] : req.params.adId;
      if (!id || !id.trim() || !adId || !adId.trim()) {
        res.status(400).json({ message: "Invalid user id or ad id." });
        return;
      }

      await this.usersService.removeFavorite(id, adId);
      res.status(204).send();
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !id.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      const query: GetNotificationsQueryDTO = {
        unreadOnly: this.toBoolean(req.query.unreadOnly),
      };

      const notifications = await this.usersService.getNotifications(id, query);
      res.status(200).json(notifications);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !id.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      const notification = await this.usersService.createNotification(id, req.body as CreateNotificationDTO);
      res.status(201).json(notification);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async markNotificationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const notificationId = Array.isArray(req.params.notificationId)
        ? req.params.notificationId[0]
        : req.params.notificationId;

      if (!id || !id.trim() || !notificationId || !notificationId.trim()) {
        res.status(400).json({ message: "Invalid user id or notification id." });
        return;
      }

      const notification = await this.usersService.markNotificationAsRead(id, notificationId);
      res.status(200).json(notification);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !id.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      await this.usersService.markAllNotificationsAsRead(id);
      res.status(204).send();
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async updateUserAccess(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !id.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      const data = req.body as UpdateUserAccessDTO;
      const user = await this.usersService.updateUserAccess(id, data);
      res.status(200).json(user);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async topUpBalance(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !id.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      const data = req.body as TopUpBalanceDTO;
      const user = await this.usersService.topUpBalance(id, data);
      res.status(200).json(user);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async adjustBalance(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !id.trim()) {
        res.status(400).json({ message: "Invalid user id." });
        return;
      }

      const data = req.body as AdjustBalanceDTO;
      const user = await this.usersService.adjustBalance(id, data);
      res.status(200).json(user);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private toBoolean(value: unknown): boolean | undefined {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (typeof normalized !== "string") return undefined;

    const lowered = normalized.trim().toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;

    return undefined;
  }

  public getRouter(): Router {
    return this.router;
  }
}
