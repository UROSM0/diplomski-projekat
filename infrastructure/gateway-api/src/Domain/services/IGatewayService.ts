import { AddFavoriteDTO } from "../DTOs/AddFavoriteDTO";
import { LoginUserDTO } from "../DTOs/LoginUserDTO";
import { RegistrationUserDTO } from "../DTOs/RegistrationUserDTO";
import { RefreshTokenDTO } from "../DTOs/RefreshTokenDTO";
import { ChangePasswordDTO } from "../DTOs/ChangePasswordDTO";
import { CreateRatingDTO } from "../DTOs/CreateRatingDTO";
import { CreateAdDTO } from "../DTOs/CreateAdDTO";
import { CreateCategoryDTO } from "../DTOs/CreateCategoryDTO";
import { GetAdsQueryDTO } from "../DTOs/GetAdsQueryDTO";
import { TopUpBalanceDTO } from "../DTOs/TopUpBalanceDTO";
import { ModerateAdDTO } from "../DTOs/ModerateAdDTO";
import { PaginatedAdsDTO } from "../DTOs/PaginatedAdsDTO";
import { PurchaseTransactionDTO } from "../DTOs/PurchaseTransactionDTO";
import { AdDTO } from "../DTOs/AdDTO";
import { CategoryDTO } from "../DTOs/CategoryDTO";
import { TransactionDTO } from "../DTOs/TransactionDTO";
import { UpdateUserAccessDTO } from "../DTOs/UpdateUserAccessDTO";
import { UpdateAdDTO } from "../DTOs/UpdateAdDTO";
import { UpdateUserProfileDTO } from "../DTOs/UpdateUserProfileDTO";
import { UserDTO } from "../DTOs/UserDTO";
import { FavoriteDTO } from "../DTOs/FavoriteDTO";
import { AuthResponseType } from "../types/AuthResponse";

export interface IGatewayService {
  // Auth
  login(data: LoginUserDTO): Promise<AuthResponseType>;
  register(data: RegistrationUserDTO): Promise<AuthResponseType>;
  refresh(data: RefreshTokenDTO): Promise<AuthResponseType>;
  logout(data: RefreshTokenDTO): Promise<AuthResponseType>;
  changePassword(userId: string, data: ChangePasswordDTO): Promise<AuthResponseType>;

  // Users
  getAllUsers(): Promise<UserDTO[]>;
  getUserById(id: string): Promise<UserDTO>;
  getFavorites(userId: string): Promise<FavoriteDTO[]>;
  addFavorite(userId: string, data: AddFavoriteDTO): Promise<FavoriteDTO>;
  removeFavorite(userId: string, adId: string): Promise<void>;
  updateUserAccess(id: string, data: UpdateUserAccessDTO): Promise<UserDTO>;
  updateUserProfile(id: string, data: UpdateUserProfileDTO): Promise<UserDTO>;
  topUpBalance(id: string, data: TopUpBalanceDTO): Promise<UserDTO>;

  // Ads
  getCategories(): Promise<CategoryDTO[]>;
  createCategory(data: CreateCategoryDTO): Promise<CategoryDTO>;
  getPublicAds(query: GetAdsQueryDTO): Promise<PaginatedAdsDTO>;
  getAdsForModeration(query: GetAdsQueryDTO): Promise<PaginatedAdsDTO>;
  getPublicAdById(id: string): Promise<AdDTO>;
  getMyAds(userId: string, query: GetAdsQueryDTO): Promise<PaginatedAdsDTO>;
  createAd(userId: string, data: CreateAdDTO): Promise<AdDTO>;
  updateAd(adId: string, userId: string, data: UpdateAdDTO): Promise<AdDTO>;
  deleteAd(adId: string, userId: string): Promise<void>;
  moderateAd(adId: string, moderatorId: string, data: ModerateAdDTO): Promise<AdDTO>;

  // Transactions
  purchaseAd(buyerId: string, data: PurchaseTransactionDTO): Promise<TransactionDTO>;
  getPurchases(userId: string): Promise<TransactionDTO[]>;
  getSales(userId: string): Promise<TransactionDTO[]>;
  rateTransaction(transactionId: string, buyerId: string, data: CreateRatingDTO): Promise<TransactionDTO>;
}
