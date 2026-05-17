import {
  Favorite,
  Notification,
  NotificationType as PrismaNotificationType,
  PrismaClient,
  User,
  UserRole as PrismaUserRole,
  UserStatus as PrismaUserStatus,
} from "@prisma/client";
import { AddFavoriteDTO } from "../Domain/DTOs/AddFavoriteDTO";
import { AdjustBalanceDTO } from "../Domain/DTOs/AdjustBalanceDTO";
import { CreateNotificationDTO } from "../Domain/DTOs/CreateNotificationDTO";
import { CreateUserDTO } from "../Domain/DTOs/CreateUserDTO";
import { FavoriteDTO } from "../Domain/DTOs/FavoriteDTO";
import { GetNotificationsQueryDTO } from "../Domain/DTOs/GetNotificationsQueryDTO";
import { NotificationDTO } from "../Domain/DTOs/NotificationDTO";
import { TopUpBalanceDTO } from "../Domain/DTOs/TopUpBalanceDTO";
import { UpdateUserAccessDTO } from "../Domain/DTOs/UpdateUserAccessDTO";
import { UpdateUserProfileDTO } from "../Domain/DTOs/UpdateUserProfileDTO";
import { IUsersService } from "../Domain/services/IUsersService";
import { UserDTO } from "../Domain/DTOs/UserDTO";

export class UsersService implements IUsersService {
  constructor(private readonly prisma: PrismaClient) {}

  async createUser(data: CreateUserDTO): Promise<UserDTO> {
    const user = await this.prisma.user.create({
      data: {
        id: data.id,
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as User["role"],
        status: data.status as User["status"],
        profileImage: data.profileImage || null,
      },
    });

    return this.toDTO(user);
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<UserDTO[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return users.map(u => this.toDTO(u));
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserDTO> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error(`User with ID ${id} not found`);
    return this.toDTO(user);
  }

  async getFavorites(userId: string): Promise<FavoriteDTO[]> {
    await this.ensureUserExists(userId);

    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return favorites.map((favorite) => this.toFavoriteDTO(favorite));
  }

  async addFavorite(userId: string, data: AddFavoriteDTO): Promise<FavoriteDTO> {
    await this.ensureUserExists(userId);

    if (!data.adId?.trim()) {
      throw new Error("Ad id is required.");
    }

    const favorite = await this.prisma.favorite.upsert({
      where: {
        userId_adId: {
          userId,
          adId: data.adId,
        },
      },
      update: {},
      create: {
        userId,
        adId: data.adId,
      },
    });

    return this.toFavoriteDTO(favorite);
  }

  async removeFavorite(userId: string, adId: string): Promise<void> {
    await this.ensureUserExists(userId);

    if (!adId?.trim()) {
      throw new Error("Ad id is required.");
    }

    await this.prisma.favorite.deleteMany({
      where: {
        userId,
        adId,
      },
    });
  }

  async getNotifications(userId: string, query: GetNotificationsQueryDTO): Promise<NotificationDTO[]> {
    await this.ensureUserExists(userId);

    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(query.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return notifications.map((notification) => this.toNotificationDTO(notification));
  }

  async createNotification(userId: string, data: CreateNotificationDTO): Promise<NotificationDTO> {
    await this.ensureUserExists(userId);

    const type = this.normalizeNotificationType(data.type);
    const title = data.title?.trim();
    const content = data.content?.trim();

    if (!title) {
      throw new Error("Notification title is required.");
    }

    if (!content) {
      throw new Error("Notification content is required.");
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
      },
    });

    return this.toNotificationDTO(notification);
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<NotificationDTO> {
    await this.ensureUserExists(userId);

    if (!notificationId?.trim()) {
      throw new Error("Notification id is required.");
    }

    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!existingNotification) {
      throw new Error("Notification not found.");
    }

    const notification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
      },
    });

    return this.toNotificationDTO(notification);
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.ensureUserExists(userId);

    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async updateUserAccess(id: string, data: UpdateUserAccessDTO): Promise<UserDTO> {
    const existingUser = await this.ensureUserExists(id);
    if (!existingUser) {
      throw new Error(`User with ID ${id} not found`);
    }

    const role = data.role ? this.normalizeRole(data.role) : undefined;
    const status = data.status ? this.normalizeStatus(data.status) : undefined;

    if (!role && !status) {
      throw new Error("At least one access field must be provided.");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
      },
    });

    return this.toDTO(updatedUser);
  }

  async updateUserProfile(id: string, data: UpdateUserProfileDTO): Promise<UserDTO> {
    const existingUser = await this.ensureUserExists(id);
    if (!existingUser) {
      throw new Error(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstName?.trim() || existingUser.firstName,
        lastName: data.lastName?.trim() || existingUser.lastName,
        profileImage: data.profileImage?.trim() ?? existingUser.profileImage,
      },
    });

    return this.toDTO(updatedUser);
  }

  async topUpBalance(id: string, data: TopUpBalanceDTO): Promise<UserDTO> {
    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      throw new Error("Top-up amount must be greater than zero.");
    }

    const existingUser = await this.ensureUserExists(id);
    if (!existingUser) {
      throw new Error(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        balance: {
          increment: data.amount,
        },
      },
    });

    return this.toDTO(updatedUser);
  }

  async adjustBalance(id: string, data: AdjustBalanceDTO): Promise<UserDTO> {
    if (!Number.isFinite(data.amount) || data.amount === 0) {
      throw new Error("Balance adjustment amount must be a non-zero number.");
    }

    const existingUser = await this.ensureUserExists(id);
    const currentBalance = Number(existingUser.balance.toString());
    const nextBalance = currentBalance + data.amount;

    if (nextBalance < 0) {
      throw new Error("Insufficient balance for this adjustment.");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        balance: {
          increment: data.amount,
        },
      },
    });

    return this.toDTO(updatedUser);
  }

  /**
   * Convert User entity to UserDTO
   */
  private toDTO(user: User): UserDTO {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      balance: Number(user.balance),
      profileImage: user.profileImage ?? "",
    };
  }

  private normalizeRole(role: string): PrismaUserRole {
    const normalizedRole = role.trim().toUpperCase();

    if (normalizedRole === PrismaUserRole.ADMIN) return PrismaUserRole.ADMIN;
    if (normalizedRole === PrismaUserRole.MANAGER) return PrismaUserRole.MANAGER;
    if (normalizedRole === PrismaUserRole.USER) return PrismaUserRole.USER;

    throw new Error("Invalid user role.");
  }

  private normalizeStatus(status: string): PrismaUserStatus {
    const normalizedStatus = status.trim().toUpperCase();

    if (normalizedStatus === PrismaUserStatus.ACTIVE) return PrismaUserStatus.ACTIVE;
    if (normalizedStatus === PrismaUserStatus.INACTIVE) return PrismaUserStatus.INACTIVE;
    if (normalizedStatus === PrismaUserStatus.BLOCKED) return PrismaUserStatus.BLOCKED;

    throw new Error("Invalid user status.");
  }

  private async ensureUserExists(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    return user;
  }

  private toFavoriteDTO(favorite: Favorite): FavoriteDTO {
    return {
      adId: favorite.adId,
      createdAt: favorite.createdAt.toISOString(),
    };
  }

  private toNotificationDTO(notification: Notification): NotificationDTO {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  private normalizeNotificationType(type: string): PrismaNotificationType {
    const normalizedType = type.trim().toUpperCase();

    if (normalizedType === PrismaNotificationType.AD_APPROVED) return PrismaNotificationType.AD_APPROVED;
    if (normalizedType === PrismaNotificationType.AD_REJECTED) return PrismaNotificationType.AD_REJECTED;
    if (normalizedType === PrismaNotificationType.NEW_MESSAGE) return PrismaNotificationType.NEW_MESSAGE;
    if (normalizedType === PrismaNotificationType.PURCHASE_SUCCESS) return PrismaNotificationType.PURCHASE_SUCCESS;
    if (normalizedType === PrismaNotificationType.NEW_RATING) return PrismaNotificationType.NEW_RATING;

    throw new Error("Invalid notification type.");
  }
}
