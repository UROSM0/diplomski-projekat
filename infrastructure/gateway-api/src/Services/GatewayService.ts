import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
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
import { CreateNotificationDTO } from "../Domain/DTOs/CreateNotificationDTO";
import { GetNotificationsQueryDTO } from "../Domain/DTOs/GetNotificationsQueryDTO";
import { NotificationDTO } from "../Domain/DTOs/NotificationDTO";
import { ConversationDTO } from "../Domain/DTOs/ConversationDTO";
import { CreateConversationDTO } from "../Domain/DTOs/CreateConversationDTO";
import { CreateMessageDTO } from "../Domain/DTOs/CreateMessageDTO";
import { MessageDTO } from "../Domain/DTOs/MessageDTO";
import { CreateAuditLogDTO } from "../Domain/DTOs/CreateAuditLogDTO";
import { GetAuditLogsQueryDTO } from "../Domain/DTOs/GetAuditLogsQueryDTO";
import { PaginatedAuditLogsDTO } from "../Domain/DTOs/PaginatedAuditLogsDTO";
import { chatRealtime } from "../Realtime/ChatRealtime";

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
          ? `Korisnik ${data.username} se prijavio.`
          : `Neuspesan pokusaj prijave za korisnika ${data.username}.`,
        metadata: { username: data.username },
      });
      return response.data;
    } catch (error) {
      await this.logAudit({
        action: "login_failed",
        service: "gateway/auth",
        description: `Neuspesan pokusaj prijave za korisnika ${data.username}.`,
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
          ? `Korisnik ${data.username} je registrovan.`
          : `Neuspela registracija za korisnika ${data.username}.`,
        metadata: { username: data.username, email: data.email },
      });
      return response.data;
    } catch (error) {
      await this.logAudit({
        action: "register_failed",
        service: "gateway/auth",
        description: `Neuspela registracija za korisnika ${data.username}.`,
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
        description: "Korisnik se odjavio.",
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
        description: "Korisnik je promenio lozinku.",
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
      description: `Oglas ${data.adId} je dodat u omiljene.`,
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
      description: `Oglas ${adId} je uklonjen iz omiljenih.`,
      metadata: { adId },
    });
  }

  async getNotifications(userId: string, query: GetNotificationsQueryDTO): Promise<NotificationDTO[]> {
    const response = await this.userClient.get<NotificationDTO[]>(`/users/${userId}/notifications`, {
      params: query,
    });
    return response.data;
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<NotificationDTO> {
    const response = await this.userClient.patch<NotificationDTO>(
      `/users/${userId}/notifications/${notificationId}/read`
    );
    return response.data;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.userClient.post(`/users/${userId}/notifications/mark-all-read`);
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
        description: `Pristup je promenjen za korisnika ${id}.`,
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
      description: "Profil korisnika je azuriran.",
    });
    return response.data;
  }

  async topUpBalance(id: string, data: TopUpBalanceDTO): Promise<UserDTO> {
    const response = await this.userClient.post<UserDTO>(`/users/${id}/top-up`, data);
    await this.logAudit({
      userId: id,
      action: "top_up",
      service: "gateway/user",
      description: `Novcanik je dopunjen za ${data.amount}.`,
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
      description: `Kategorija ${data.name} je kreirana.`,
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

  async createAd(userId: string, data: CreateAdDTO, files: Express.Multer.File[]): Promise<AdDTO> {
    const formData = this.buildAdFormData(
      {
        ...data,
        sellerId: userId,
      },
      files
    );
    const response = await this.adClient.post<AdDTO>("/ads", formData, {
      headers: formData.getHeaders(),
    });
    await this.logAudit({
      userId,
      action: "create_ad",
      service: "gateway/ad",
      description: `Kreiran je oglas ${response.data.id}.`,
      metadata: { adId: response.data.id, title: response.data.title },
    });
    return response.data;
  }

  async updateAd(adId: string, userId: string, data: UpdateAdDTO, files: Express.Multer.File[]): Promise<AdDTO> {
    const formData = this.buildAdFormData(
      {
        ...data,
        sellerId: userId,
      },
      files
    );
    const response = await this.adClient.patch<AdDTO>(`/ads/${adId}`, formData, {
      headers: formData.getHeaders(),
    });
    await this.logAudit({
      userId,
      action: "update_ad",
      service: "gateway/ad",
      description: `Izmenjen je oglas ${adId}.`,
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
      description: `Obrisan je oglas ${adId}.`,
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
      description: `Moderator je promenio status oglasa ${adId} na ${data.status}.`,
      metadata: { adId, status: data.status, moderationNote: data.moderationNote },
    });
    const isApproved = data.status?.toUpperCase() === "APPROVED";
    await this.createNotification(response.data.sellerId, {
      type: isApproved ? "AD_APPROVED" : "AD_REJECTED",
      title: isApproved ? "Oglas je odobren" : "Oglas je odbijen",
      content: isApproved
        ? `Vas oglas "${response.data.title}" je odobren i sada je javno vidljiv.`
        : `Vas oglas "${response.data.title}" je odbijen.${data.moderationNote ? ` Napomena: ${data.moderationNote}` : ""}`,
    });
    return response.data;
  }

  async purchaseAd(buyerId: string, data: PurchaseTransactionDTO): Promise<TransactionDTO> {
    try {
      const response = await this.transactionClient.post<TransactionDTO>("/transactions/purchase", {
        ...data,
        buyerId,
      });
      await this.logAudit({
        userId: buyerId,
        action: "buy",
        service: "gateway/transaction",
        description: `Korisnik je kupio oglas ${data.adId}.`,
        metadata: { adId: data.adId, transactionId: response.data.id },
      });
      await this.createNotification(buyerId, {
        type: "PURCHASE_SUCCESS",
        title: "Kupovina je uspesna",
        content: `Kupili ste "${response.data.adTitle}" za ${response.data.amount.toFixed(2)} RSD.`,
      });
      await this.createNotification(response.data.sellerId, {
        type: "PURCHASE_SUCCESS",
        title: "Oglas je prodat",
        content: `Vas oglas "${response.data.adTitle}" je prodat za ${response.data.amount.toFixed(2)} RSD.`,
      });
      return response.data;
    } catch (error) {
      throw this.toServiceError(error, "Purchase failed.");
    }
  }

  async getPurchases(userId: string): Promise<TransactionDTO[]> {
    const response = await this.transactionClient.get<TransactionDTO[]>(`/transactions/buyer/${userId}`);
    return response.data;
  }

  async getSales(userId: string): Promise<TransactionDTO[]> {
    const response = await this.transactionClient.get<TransactionDTO[]>(`/transactions/seller/${userId}`);
    return response.data;
  }

  async rateTransaction(transactionId: string, reviewerId: string, data: CreateRatingDTO): Promise<TransactionDTO> {
    try {
      const response = await this.transactionClient.post<TransactionDTO>(`/transactions/${transactionId}/rating`, {
        ...data,
        reviewerId,
      });
      await this.logAudit({
        userId: reviewerId,
        action: "rate_transaction",
        service: "gateway/transaction",
        description: `Korisnik je ocenio transakciju ${transactionId}.`,
        metadata: { transactionId, score: data.score },
      });
      const revieweeId = response.data.buyerId === reviewerId
        ? response.data.sellerId
        : response.data.buyerId;
      await this.createNotification(revieweeId, {
        type: "NEW_RATING",
        title: "Stigla je nova ocena",
        content: `Dobili ste ocenu ${data.score}/5 za oglas "${response.data.adTitle}".`,
      });
      return response.data;
    } catch (error) {
      throw this.toServiceError(error, "Rating failed.");
    }
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
      description: `Otvoren je razgovor za oglas ${data.adId}.`,
      metadata: { adId: data.adId, conversationId: response.data.id },
    });
    chatRealtime.emitToUsers(
      [response.data.participantOneId, response.data.participantTwoId],
      "conversation:updated",
      response.data
    );
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
    const conversation = await this.getConversationByIdInternal(conversationId, userId);
    const recipientId =
      conversation.participantOneId === userId ? conversation.participantTwoId : conversation.participantOneId;
    await this.logAudit({
      userId,
      action: "send_message",
      service: "gateway/chat",
      description: `Poslata je poruka u razgovoru ${conversationId}.`,
      metadata: { conversationId, messageId: response.data.id },
    });
    await this.createNotification(recipientId, {
      type: "NEW_MESSAGE",
      title: "Stigla je nova poruka",
      content: `Imate novu poruku za oglas "${conversation.adTitle}".`,
    });
    const updatedConversation: ConversationDTO = {
      ...conversation,
      lastMessage: response.data,
      updatedAt: response.data.createdAt,
    };
    chatRealtime.emitToUsers(
      [conversation.participantOneId, conversation.participantTwoId],
      "message:new",
      { message: response.data, conversation: updatedConversation }
    );
    return response.data;
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    await this.chatClient.patch(`/conversations/${conversationId}/read`, { userId });
    const conversation = await this.getConversationByIdInternal(conversationId, userId);
    chatRealtime.emitToUsers(
      [conversation.participantOneId, conversation.participantTwoId],
      "conversation:read",
      { conversationId, readByUserId: userId }
    );
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

  private async createNotification(userId: string, data: CreateNotificationDTO): Promise<void> {
    try {
      await this.userClient.post(`/users/${userId}/notifications`, data);
    } catch {
      // Notifications must not break the user-facing operation.
    }
  }

  private async getConversationByIdInternal(conversationId: string, userId: string): Promise<ConversationDTO> {
    const response = await this.chatClient.get<ConversationDTO>(`/conversations/${conversationId}`, {
      params: { userId },
    });
    return response.data;
  }

  private buildAdFormData(
    data: (CreateAdDTO | UpdateAdDTO) & { sellerId: string },
    files: Express.Multer.File[]
  ): FormData {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      formData.append(key, String(value));
    });

    files.forEach((file) => {
      formData.append("images", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    });

    return formData;
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

  private toServiceError(error: unknown, fallbackMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message;
      return new Error(message ?? fallbackMessage);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(fallbackMessage);
  }
}
