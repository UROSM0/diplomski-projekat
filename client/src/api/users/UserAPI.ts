import axios, { AxiosInstance } from "axios";
import { IUserAPI } from "./IUserAPI";
import { AddFavoriteDTO } from "../../models/users/AddFavoriteDTO";
import { ChangePasswordDTO } from "../../models/users/ChangePasswordDTO";
import { FavoriteDTO } from "../../models/users/FavoriteDTO";
import { GetNotificationsQueryDTO } from "../../models/users/GetNotificationsQueryDTO";
import { NotificationDTO } from "../../models/users/NotificationDTO";
import { PublicUserDTO } from "../../models/users/PublicUserDTO";
import { TopUpBalanceDTO } from "../../models/users/TopUpBalanceDTO";
import { UpdateUserAccessDTO } from "../../models/users/UpdateUserAccessDTO";
import { UpdateUserProfileDTO } from "../../models/users/UpdateUserProfileDTO";
import { UserDTO } from "../../models/users/UserDTO";
import { createApiError } from "../shared/apiError";

export class UserAPI implements IUserAPI {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_GATEWAY_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async getCurrentUser(token: string): Promise<UserDTO> {
    try {
      return (
        await this.axiosInstance.get<UserDTO>("/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to load your profile.");
    }
  }

  async getAllUsers(token: string): Promise<UserDTO[]> {
    try {
      return (
        await this.axiosInstance.get<UserDTO[]>("/users", {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to load users for admin management.");
    }
  }

  async getUserById(token: string, id: string): Promise<UserDTO> {
    try {
      return (
        await this.axiosInstance.get<UserDTO>(`/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to load your profile.");
    }
  }

  async getPublicUserById(id: string): Promise<PublicUserDTO> {
    try {
      return (
        await this.axiosInstance.get<PublicUserDTO>(`/users/${id}/public`)
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to load public user profile.");
    }
  }

  async getFavorites(token: string): Promise<FavoriteDTO[]> {
    try {
      return (
        await this.axiosInstance.get<FavoriteDTO[]>("/users/me/favorites", {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }

      throw createApiError(error, "Failed to update favorites.");
    }
  }

  async addFavorite(token: string, data: AddFavoriteDTO): Promise<FavoriteDTO> {
    try {
      return (
        await this.axiosInstance.post<FavoriteDTO>("/users/me/favorites", data, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to update favorites.");
    }
  }

  async removeFavorite(token: string, adId: string): Promise<void> {
    try {
      await this.axiosInstance.delete(`/users/me/favorites/${adId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      throw createApiError(error, "Failed to update favorites.");
    }
  }

  async getNotifications(token: string, query?: GetNotificationsQueryDTO): Promise<NotificationDTO[]> {
    try {
      return (
        await this.axiosInstance.get<NotificationDTO[]>("/users/me/notifications", {
          headers: { Authorization: `Bearer ${token}` },
          params: query,
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to load notifications.");
    }
  }

  async markNotificationAsRead(token: string, notificationId: string): Promise<NotificationDTO> {
    try {
      return (
        await this.axiosInstance.patch<NotificationDTO>(`/users/me/notifications/${notificationId}/read`, undefined, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to update notification.");
    }
  }

  async markAllNotificationsAsRead(token: string): Promise<void> {
    try {
      await this.axiosInstance.post("/users/me/notifications/mark-all-read", undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      throw createApiError(error, "Failed to mark notifications as read.");
    }
  }

  async changePassword(token: string, data: ChangePasswordDTO): Promise<void> {
    try {
      await this.axiosInstance.post(
        "/users/me/change-password",
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      throw createApiError(error, "Password change failed.");
    }
  }

  async updateUserAccess(token: string, id: string, data: UpdateUserAccessDTO): Promise<UserDTO> {
    try {
      return (
        await this.axiosInstance.patch<UserDTO>(`/users/${id}/access`, data, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Access update failed.");
    }
  }

  async updateCurrentUser(token: string, data: UpdateUserProfileDTO): Promise<UserDTO> {
    try {
      return (
        await this.axiosInstance.patch<UserDTO>("/users/me", data, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Profile update failed.");
    }
  }

  async topUpBalance(token: string, data: TopUpBalanceDTO): Promise<UserDTO> {
    try {
      return (
        await this.axiosInstance.post<UserDTO>("/users/me/top-up", data, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Wallet top-up failed.");
    }
  }
}
