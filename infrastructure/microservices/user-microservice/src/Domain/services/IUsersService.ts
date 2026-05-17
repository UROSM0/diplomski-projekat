import { AddFavoriteDTO } from "../DTOs/AddFavoriteDTO";
import { AdjustBalanceDTO } from "../DTOs/AdjustBalanceDTO";
import { CreateNotificationDTO } from "../DTOs/CreateNotificationDTO";
import { CreateUserDTO } from "../DTOs/CreateUserDTO";
import { FavoriteDTO } from "../DTOs/FavoriteDTO";
import { GetNotificationsQueryDTO } from "../DTOs/GetNotificationsQueryDTO";
import { NotificationDTO } from "../DTOs/NotificationDTO";
import { TopUpBalanceDTO } from "../DTOs/TopUpBalanceDTO";
import { UpdateUserAccessDTO } from "../DTOs/UpdateUserAccessDTO";
import { UpdateUserProfileDTO } from "../DTOs/UpdateUserProfileDTO";
import { UserDTO } from "../DTOs/UserDTO";

export interface IUsersService {
  createUser(data: CreateUserDTO): Promise<UserDTO>;
  getAllUsers(): Promise<UserDTO[]>;
  getUserById(id: string): Promise<UserDTO>;
  getFavorites(userId: string): Promise<FavoriteDTO[]>;
  addFavorite(userId: string, data: AddFavoriteDTO): Promise<FavoriteDTO>;
  removeFavorite(userId: string, adId: string): Promise<void>;
  getNotifications(userId: string, query: GetNotificationsQueryDTO): Promise<NotificationDTO[]>;
  createNotification(userId: string, data: CreateNotificationDTO): Promise<NotificationDTO>;
  markNotificationAsRead(userId: string, notificationId: string): Promise<NotificationDTO>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  updateUserAccess(id: string, data: UpdateUserAccessDTO): Promise<UserDTO>;
  updateUserProfile(id: string, data: UpdateUserProfileDTO): Promise<UserDTO>;
  topUpBalance(id: string, data: TopUpBalanceDTO): Promise<UserDTO>;
  adjustBalance(id: string, data: AdjustBalanceDTO): Promise<UserDTO>;
}
