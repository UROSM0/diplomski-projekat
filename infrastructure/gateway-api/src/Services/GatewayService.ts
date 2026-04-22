import axios, { AxiosInstance } from "axios";
import { IGatewayService } from "../Domain/services/IGatewayService";
import { AddFavoriteDTO } from "../Domain/DTOs/AddFavoriteDTO";
import { LoginUserDTO } from "../Domain/DTOs/LoginUserDTO";
import { RegistrationUserDTO } from "../Domain/DTOs/RegistrationUserDTO";
import { RefreshTokenDTO } from "../Domain/DTOs/RefreshTokenDTO";
import { ChangePasswordDTO } from "../Domain/DTOs/ChangePasswordDTO";
import { CreateRatingDTO } from "../Domain/DTOs/CreateRatingDTO";
import { CreateAdDTO } from "../Domain/DTOs/CreateAdDTO";
import { CreateCategoryDTO } from "../Domain/DTOs/CreateCategoryDTO";
import { GetAdsQueryDTO } from "../Domain/DTOs/GetAdsQueryDTO";
import { TopUpBalanceDTO } from "../Domain/DTOs/TopUpBalanceDTO";
import { ModerateAdDTO } from "../Domain/DTOs/ModerateAdDTO";
import { PaginatedAdsDTO } from "../Domain/DTOs/PaginatedAdsDTO";
import { PurchaseTransactionDTO } from "../Domain/DTOs/PurchaseTransactionDTO";
import { AdDTO } from "../Domain/DTOs/AdDTO";
import { CategoryDTO } from "../Domain/DTOs/CategoryDTO";
import { TransactionDTO } from "../Domain/DTOs/TransactionDTO";
import { UpdateUserAccessDTO } from "../Domain/DTOs/UpdateUserAccessDTO";
import { UpdateAdDTO } from "../Domain/DTOs/UpdateAdDTO";
import { UpdateUserProfileDTO } from "../Domain/DTOs/UpdateUserProfileDTO";
import { AuthResponseType } from "../Domain/types/AuthResponse";
import { UserDTO } from "../Domain/DTOs/UserDTO";
import { FavoriteDTO } from "../Domain/DTOs/FavoriteDTO";

export class GatewayService implements IGatewayService {
  private readonly authClient: AxiosInstance;
  private readonly userClient: AxiosInstance;
  private readonly adClient: AxiosInstance;
  private readonly transactionClient: AxiosInstance;

  constructor() {
    const authBaseURL = process.env.AUTH_SERVICE_API;
    const userBaseURL = process.env.USER_SERVICE_API;
    const adBaseURL = process.env.AD_SERVICE_API;
    const transactionBaseURL = process.env.TRANSACTION_SERVICE_API;

    this.authClient = axios.create({
      baseURL: authBaseURL,
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    this.userClient = axios.create({
      baseURL: userBaseURL,
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    this.adClient = axios.create({
      baseURL: adBaseURL,
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    this.transactionClient = axios.create({
      baseURL: transactionBaseURL,
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    // TODO: ADD MORE CLIENTS
  }

  // Auth microservice
  async login(data: LoginUserDTO): Promise<AuthResponseType> {
    try {
      const response = await this.authClient.post<AuthResponseType>("/auth/login", data);
      return response.data;
    } catch (error) {
      return this.handleAuthError(error, "Login failed.");
    }
  }

  async register(data: RegistrationUserDTO): Promise<AuthResponseType> {
    try {
      const response = await this.authClient.post<AuthResponseType>("/auth/register", data);
      return response.data;
    } catch (error) {
      return this.handleAuthError(error, "Registration failed.");
    }
  }

  async refresh(data: RefreshTokenDTO): Promise<AuthResponseType> {
    try {
      const response = await this.authClient.post<AuthResponseType>("/auth/refresh", data);
      return response.data;
    } catch (error) {
      return this.handleAuthError(error, "Refresh failed.");
    }
  }

  async logout(data: RefreshTokenDTO): Promise<AuthResponseType> {
    try {
      const response = await this.authClient.post<AuthResponseType>("/auth/logout", data);
      return response.data;
    } catch (error) {
      return this.handleAuthError(error, "Logout failed.");
    }
  }

  async changePassword(userId: string, data: ChangePasswordDTO): Promise<AuthResponseType> {
    try {
      const response = await this.authClient.post<AuthResponseType>("/auth/change-password", {
        ...data,
        userId,
      });
      return response.data;
    } catch (error) {
      return this.handleAuthError(error, "Password change failed.");
    }
  }

  // User microservice
  async getAllUsers(): Promise<UserDTO[]> {
    const response = await this.userClient.get<UserDTO[]>("/users");
    return response.data;
  }

  async getUserById(id: string): Promise<UserDTO> {
    const response = await this.userClient.get<UserDTO>(`/users/${id}`);
    return response.data;
  }

  async getFavorites(userId: string): Promise<FavoriteDTO[]> {
    const response = await this.userClient.get<FavoriteDTO[]>(`/users/${userId}/favorites`);
    return response.data;
  }

  async addFavorite(userId: string, data: AddFavoriteDTO): Promise<FavoriteDTO> {
    const response = await this.userClient.post<FavoriteDTO>(`/users/${userId}/favorites`, data);
    return response.data;
  }

  async removeFavorite(userId: string, adId: string): Promise<void> {
    await this.userClient.delete(`/users/${userId}/favorites/${adId}`);
  }

  async updateUserAccess(id: string, data: UpdateUserAccessDTO): Promise<UserDTO> {
    const currentUserResponse = await this.userClient.get<UserDTO>(`/users/${id}`);
    const currentUser = currentUserResponse.data;

    await this.authClient.patch(`/internal/users/${id}/access`, data);

    try {
      const response = await this.userClient.patch<UserDTO>(`/users/${id}/access`, data);
      return response.data;
    } catch (error) {
      try {
        await this.authClient.patch(`/internal/users/${id}/access`, {
          role: currentUser.role,
          status: currentUser.status,
        });
      } catch {
        // Best-effort rollback to keep auth and user access aligned.
      }

      throw error;
    }
  }

  async updateUserProfile(id: string, data: UpdateUserProfileDTO): Promise<UserDTO> {
    const response = await this.userClient.patch<UserDTO>(`/users/${id}/profile`, data);
    return response.data;
  }

  async topUpBalance(id: string, data: TopUpBalanceDTO): Promise<UserDTO> {
    const response = await this.userClient.post<UserDTO>(`/users/${id}/top-up`, data);
    return response.data;
  }

  // Ad microservice
  async getCategories(): Promise<CategoryDTO[]> {
    const response = await this.adClient.get<CategoryDTO[]>("/categories");
    return response.data;
  }

  async createCategory(data: CreateCategoryDTO): Promise<CategoryDTO> {
    const response = await this.adClient.post<CategoryDTO>("/categories", data);
    return response.data;
  }

  async getPublicAds(query: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    const response = await this.adClient.get<PaginatedAdsDTO>("/ads", {
      params: query,
    });
    return response.data;
  }

  async getAdsForModeration(query: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    const response = await this.adClient.get<PaginatedAdsDTO>("/ads/review", {
      params: query,
    });
    return response.data;
  }

  async getPublicAdById(id: string): Promise<AdDTO> {
    const response = await this.adClient.get<AdDTO>(`/ads/${id}`);
    return response.data;
  }

  async getMyAds(userId: string, query: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    const response = await this.adClient.get<PaginatedAdsDTO>(`/ads/my/${userId}`, {
      params: query,
    });
    return response.data;
  }

  async createAd(userId: string, data: CreateAdDTO): Promise<AdDTO> {
    const response = await this.adClient.post<AdDTO>("/ads", {
      ...data,
      sellerId: userId,
    });
    return response.data;
  }

  async updateAd(adId: string, userId: string, data: UpdateAdDTO): Promise<AdDTO> {
    const response = await this.adClient.patch<AdDTO>(`/ads/${adId}`, {
      ...data,
      sellerId: userId,
    });
    return response.data;
  }

  async deleteAd(adId: string, userId: string): Promise<void> {
    await this.adClient.delete(`/ads/${adId}`, {
      data: {
        sellerId: userId,
      },
    });
  }

  async moderateAd(adId: string, moderatorId: string, data: ModerateAdDTO): Promise<AdDTO> {
    const response = await this.adClient.patch<AdDTO>(`/ads/${adId}/moderation`, {
      ...data,
      moderatorId,
    });
    return response.data;
  }

  async purchaseAd(buyerId: string, data: PurchaseTransactionDTO): Promise<TransactionDTO> {
    const response = await this.transactionClient.post<TransactionDTO>("/transactions/purchase", {
      ...data,
      buyerId,
    });
    return response.data;
  }

  async getPurchases(userId: string): Promise<TransactionDTO[]> {
    const response = await this.transactionClient.get<TransactionDTO[]>(`/transactions/buyer/${userId}`);
    return response.data;
  }

  async getSales(userId: string): Promise<TransactionDTO[]> {
    const response = await this.transactionClient.get<TransactionDTO[]>(`/transactions/seller/${userId}`);
    return response.data;
  }

  async rateTransaction(transactionId: string, buyerId: string, data: CreateRatingDTO): Promise<TransactionDTO> {
    const response = await this.transactionClient.post<TransactionDTO>(`/transactions/${transactionId}/rating`, {
      ...data,
      buyerId,
    });
    return response.data;
  }

  // TODO: ADD MORE API CALLS
  private handleAuthError(error: unknown, fallbackMessage: string): AuthResponseType {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data as { message?: string } | undefined;
      return {
        success: false,
        message: errorData?.message ?? fallbackMessage,
      };
    }

    return {
      success: false,
      message: fallbackMessage,
    };
  }
}
