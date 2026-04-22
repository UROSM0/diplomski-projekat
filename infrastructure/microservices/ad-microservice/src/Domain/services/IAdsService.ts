import { AdDTO } from "../DTOs/AdDTO";
import { CategoryDTO } from "../DTOs/CategoryDTO";
import { CreateAdDTO } from "../DTOs/CreateAdDTO";
import { CreateCategoryDTO } from "../DTOs/CreateCategoryDTO";
import { GetAdsQueryDTO } from "../DTOs/GetAdsQueryDTO";
import { ModerateAdDTO } from "../DTOs/ModerateAdDTO";
import { PaginatedAdsDTO } from "../DTOs/PaginatedAdsDTO";
import { UpdateAdStatusDTO } from "../DTOs/UpdateAdStatusDTO";
import { UpdateAdDTO } from "../DTOs/UpdateAdDTO";

export interface IAdsService {
  getCategories(): Promise<CategoryDTO[]>;
  createCategory(data: CreateCategoryDTO): Promise<CategoryDTO>;
  createAd(data: CreateAdDTO): Promise<AdDTO>;
  getPublicAds(query: GetAdsQueryDTO): Promise<PaginatedAdsDTO>;
  getAdsForModeration(query: GetAdsQueryDTO): Promise<PaginatedAdsDTO>;
  getPublicAdById(id: string): Promise<AdDTO>;
  getAdByIdInternal(id: string): Promise<AdDTO>;
  getAdsBySeller(sellerId: string, query: GetAdsQueryDTO): Promise<PaginatedAdsDTO>;
  updateAd(adId: string, sellerId: string, data: UpdateAdDTO): Promise<AdDTO>;
  deleteAd(adId: string, sellerId: string): Promise<void>;
  moderateAd(adId: string, data: ModerateAdDTO): Promise<AdDTO>;
  updateAdStatusInternal(adId: string, data: UpdateAdStatusDTO): Promise<AdDTO>;
}
