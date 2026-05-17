import axios, { AxiosInstance } from "axios";
import { IUserAPI } from "./IUserAPI";
import { AddFavoriteDTO } from "../../models/users/AddFavoriteDTO";
import { ChangePasswordDTO } from "../../models/users/ChangePasswordDTO";
import { FavoriteDTO } from "../../models/users/FavoriteDTO";
import { GetNotificationsQueryDTO } from "../../models/users/GetNotificationsQueryDTO";
import { NotificationDTO } from "../../models/users/NotificationDTO";
import { TopUpBalanceDTO } from "../../models/users/TopUpBalanceDTO";
import { UpdateUserAccessDTO } from "../../models/users/UpdateUserAccessDTO";
import { UpdateUserProfileDTO } from "../../models/users/UpdateUserProfileDTO";
import { UserDTO } from "../../models/users/UserDTO";

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
    return (
      await this.axiosInstance.get<UserDTO>("/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async getAllUsers(token: string): Promise<UserDTO[]> {
    return (
      await this.axiosInstance.get<UserDTO[]>("/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async getUserById(token: string, id: string): Promise<UserDTO> {
    return (
      await this.axiosInstance.get<UserDTO>(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
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

      throw error;
    }
  }

  async addFavorite(token: string, data: AddFavoriteDTO): Promise<FavoriteDTO> {
    return (
      await this.axiosInstance.post<FavoriteDTO>("/users/me/favorites", data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async removeFavorite(token: string, adId: string): Promise<void> {
    await this.axiosInstance.delete(`/users/me/favorites/${adId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getNotifications(token: string, query?: GetNotificationsQueryDTO): Promise<NotificationDTO[]> {
    return (
      await this.axiosInstance.get<NotificationDTO[]>("/users/me/notifications", {
        headers: { Authorization: `Bearer ${token}` },
        params: query,
      })
    ).data;
  }

  async markNotificationAsRead(token: string, notificationId: string): Promise<NotificationDTO> {
    return (
      await this.axiosInstance.patch<NotificationDTO>(`/users/me/notifications/${notificationId}/read`, undefined, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async markAllNotificationsAsRead(token: string): Promise<void> {
    await this.axiosInstance.post("/users/me/notifications/mark-all-read", undefined, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async changePassword(token: string, data: ChangePasswordDTO): Promise<void> {
    await this.axiosInstance.post(
      "/users/me/change-password",
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }

  async updateUserAccess(token: string, id: string, data: UpdateUserAccessDTO): Promise<UserDTO> {
    return (
      await this.axiosInstance.patch<UserDTO>(`/users/${id}/access`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async updateCurrentUser(token: string, data: UpdateUserProfileDTO): Promise<UserDTO> {
    return (
      await this.axiosInstance.patch<UserDTO>("/users/me", data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async topUpBalance(token: string, data: TopUpBalanceDTO): Promise<UserDTO> {
    return (
      await this.axiosInstance.post<UserDTO>("/users/me/top-up", data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }
}
