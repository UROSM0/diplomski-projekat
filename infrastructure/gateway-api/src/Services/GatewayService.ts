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
import { ConversationDTO } from "../Domain/DTOs/ConversationDTO";
import { CreateConversationDTO } from "../Domain/DTOs/CreateConversationDTO";
import { CreateMessageDTO } from "../Domain/DTOs/CreateMessageDTO";
import { MessageDTO } from "../Domain/DTOs/MessageDTO";
import { CreateAuditLogDTO } from "../Domain/DTOs/CreateAuditLogDTO";
import { GetAuditLogsQueryDTO } from "../Domain/DTOs/GetAuditLogsQueryDTO";
import { PaginatedAuditLogsDTO } from "../Domain/DTOs/PaginatedAuditLogsDTO";

export class GatewayService implements IGatewayService {
  private readonly authClient: AxiosInstance;
  private readonly userClient: AxiosInstance;
  private readonly adClient: AxiosInstance;
  private readonly transactionClient: AxiosInstance;
  private readonly chatClient: AxiosInstance;
  private readonly auditClient: AxiosInstance;

  constructor() {
    const authBaseURL = process.env.AUTH_SERVICE_URL ?? process.env.AUTH_SERVICE_API;
    const userBaseURL = process.env.USER_SERVICE_URL ?? process.env.USER_SERVICE_API;
    const adBaseURL = process.env.AD_SERVICE_URL ?? process.env.AD_SERVICE_API;
    const transactionBaseURL = process.env.TRANSACTION_SERVICE_URL ?? process.env.TRANSACTION_SERVICE_API;
    const chatBaseURL = process.env.CHAT_SERVICE_URL ?? process.env.CHAT_SERVICE_API;
    const auditBaseURL = process.env.AUDIT_SERVICE_URL ?? process.env.AUDIT_SERVICE_API;

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

    this.chatClient = axios.create({
      baseURL: chatBaseURL,
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    this.auditClient = axios.create({
      baseURL: auditBaseURL,
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });
  }

  // Auth microservice
  async login(data: LoginUserDTO): Promise<AuthResponseType> {
    try {
      const response = await this.authClient.post<AuthResponseType>("/auth/login", data);
      await this.logAudit({
        userId: response.data.user?.id ?? null,
        action: response.data.success ? "login" : "login_failed",
        service: "gateway/auth",
        description: response.data.success
          ? `User ${data.username} logged in.`
          : `Failed login attempt for ${data.username}.`,
        metadata: { username: data.username },
      });
      return response.data;
    } catch (error) {
      await this.logAudit({
        action: "login_failed",
        service: "gateway/auth",
        description: `Failed login attempt for ${data.username}.`,
        metadata: { username: data.username },
      });
      return this.handleAuthError(error, "Login failed.");
    }
  }

  async register(data: RegistrationUserDTO): Promise<AuthResponseType> {
    try {
      const response = await this.authClient.post<AuthResponseType>("/auth/register", data);
      await this.logAudit({
        userId: response.data.user?.id ?? null,
        action: response.data.success ? "register" : "register_failed",
        service: "gateway/auth",
        description: response.data.success
          ? `User ${data.username} registered.`
          : `Failed registration for ${data.username}.`,
        metadata: { username: data.username, email: data.email },
      });
      return response.data;
    } catch (error) {
      await this.logAudit({
        action: "register_failed",
        service: "gateway/auth",
        description: `Failed registration for ${data.username}.`,
        metadata: { username: data.username, email: data.email },
      });
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
      await this.logAudit({
        action: "logout",
        service: "gateway/auth",
        description: "User logged out.",
      });
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
      await this.logAudit({
        userId,
        action: "change_password",
        service: "gateway/auth",
        description: "User changed password.",
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
    await this.logAudit({
      userId,
      action: "add_favorite",
      service: "gateway/user",
      description: `User added ad ${data.adId} to favorites.`,
      metadata: { adId: data.adId },
    });
    return response.data;
  }

  async removeFavorite(userId: string, adId: string): Promise<void> {
    await this.userClient.delete(`/users/${userId}/favorites/${adId}`);
    await this.logAudit({
      userId,
      action: "remove_favorite",
      service: "gateway/user",
      description: `User removed ad ${adId} from favorites.`,
      metadata: { adId },
    });
  }

  async updateUserAccess(id: string, data: UpdateUserAccessDTO): Promise<UserDTO> {
    const currentUserResponse = await this.userClient.get<UserDTO>(`/users/${id}`);
    const currentUser = currentUserResponse.data;

    await this.authClient.patch(`/internal/users/${id}/access`, data);

    try {
      const response = await this.userClient.patch<UserDTO>(`/users/${id}/access`, data);
      await this.logAudit({
        userId: id,
        action: "change_user_access",
        service: "gateway/user",
        description: `User access changed for ${id}.`,
        metadata: data as Record<string, unknown>,
      });
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
    await this.logAudit({
      userId: id,
      action: "update_profile",
      service: "gateway/user",
      description: "User profile updated.",
    });
    return response.data;
  }

  async topUpBalance(id: string, data: TopUpBalanceDTO): Promise<UserDTO> {
    const response = await this.userClient.post<UserDTO>(`/users/${id}/top-up`, data);
    await this.logAudit({
      userId: id,
      action: "top_up",
      service: "gateway/user",
      description: `User topped up wallet by ${data.amount}.`,
      metadata: { amount: data.amount },
    });
    return response.data;
  }

  // Ad microservice
  async getCategories(): Promise<CategoryDTO[]> {
    const response = await this.adClient.get<CategoryDTO[]>("/categories");
    return response.data;
  }

  async createCategory(data: CreateCategoryDTO): Promise<CategoryDTO> {
    const response = await this.adClient.post<CategoryDTO>("/categories", data);
    await this.logAudit({
      action: "create_category",
      service: "gateway/ad",
      description: `Category ${data.name} created.`,
      metadata: { name: data.name },
    });
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
    await this.logAudit({
      userId,
      action: "create_ad",
      service: "gateway/ad",
      description: `User created ad ${response.data.id}.`,
      metadata: { adId: response.data.id, title: response.data.title },
    });
    return response.data;
  }

  async updateAd(adId: string, userId: string, data: UpdateAdDTO): Promise<AdDTO> {
    const response = await this.adClient.patch<AdDTO>(`/ads/${adId}`, {
      ...data,
      sellerId: userId,
    });
    await this.logAudit({
      userId,
      action: "update_ad",
      service: "gateway/ad",
      description: `User updated ad ${adId}.`,
      metadata: { adId },
    });
    return response.data;
  }

  async deleteAd(adId: string, userId: string): Promise<void> {
    await this.adClient.delete(`/ads/${adId}`, {
      data: {
        sellerId: userId,
      },
    });
    await this.logAudit({
      userId,
      action: "delete_ad",
      service: "gateway/ad",
      description: `User deleted ad ${adId}.`,
      metadata: { adId },
    });
  }

  async moderateAd(adId: string, moderatorId: string, data: ModerateAdDTO): Promise<AdDTO> {
    const response = await this.adClient.patch<AdDTO>(`/ads/${adId}/moderation`, {
      ...data,
      moderatorId,
    });
    await this.logAudit({
      userId: moderatorId,
      action: data.status?.toLowerCase() === "approved" ? "approve_ad" : "reject_ad",
      service: "gateway/ad",
      description: `Moderator changed moderation status for ad ${adId} to ${data.status}.`,
      metadata: { adId, status: data.status, moderationNote: data.moderationNote },
    });
    return response.data;
  }

  async purchaseAd(buyerId: string, data: PurchaseTransactionDTO): Promise<TransactionDTO> {
    const response = await this.transactionClient.post<TransactionDTO>("/transactions/purchase", {
      ...data,
      buyerId,
    });
    await this.logAudit({
      userId: buyerId,
      action: "buy",
      service: "gateway/transaction",
      description: `User purchased ad ${data.adId}.`,
      metadata: { adId: data.adId, transactionId: response.data.id },
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
    await this.logAudit({
      userId: buyerId,
      action: "rate_transaction",
      service: "gateway/transaction",
      description: `User rated transaction ${transactionId}.`,
      metadata: { transactionId, score: data.score },
    });
    return response.data;
  }

  async createOrGetConversation(userId: string, data: CreateConversationDTO): Promise<ConversationDTO> {
    const response = await this.chatClient.post<ConversationDTO>("/conversations", {
      ...data,
      requesterId: userId,
    });
    await this.logAudit({
      userId,
      action: "open_conversation",
      service: "gateway/chat",
      description: `User opened conversation for ad ${data.adId}.`,
      metadata: { adId: data.adId, conversationId: response.data.id },
    });
    return response.data;
  }

  async getConversations(userId: string): Promise<ConversationDTO[]> {
    const response = await this.chatClient.get<ConversationDTO[]>(`/users/${userId}/conversations`);
    return response.data;
  }

  async getMessages(conversationId: string, userId: string): Promise<MessageDTO[]> {
    const response = await this.chatClient.get<MessageDTO[]>(`/conversations/${conversationId}/messages`, {
      params: { userId },
    });
    return response.data;
  }

  async sendMessage(conversationId: string, userId: string, data: CreateMessageDTO): Promise<MessageDTO> {
    const response = await this.chatClient.post<MessageDTO>(`/conversations/${conversationId}/messages`, {
      ...data,
      senderId: userId,
    });
    await this.logAudit({
      userId,
      action: "send_message",
      service: "gateway/chat",
      description: `User sent a message in conversation ${conversationId}.`,
      metadata: { conversationId, messageId: response.data.id },
    });
    return response.data;
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    await this.chatClient.patch(`/conversations/${conversationId}/read`, { userId });
  }

  async getAuditLogs(query: GetAuditLogsQueryDTO): Promise<PaginatedAuditLogsDTO> {
    const response = await this.auditClient.get<PaginatedAuditLogsDTO>("/audit/logs", {
      params: query,
    });
    return response.data;
  }

  private async logAudit(data: CreateAuditLogDTO): Promise<void> {
    try {
      await this.auditClient.post("/audit/logs", data);
    } catch {
      // Audit must not break the user-facing operation.
    }
  }

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
