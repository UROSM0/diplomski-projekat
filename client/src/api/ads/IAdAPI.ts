import { AdDTO } from "../../models/ads/AdDTO";
import { CategoryDTO } from "../../models/ads/CategoryDTO";
import { CreateAdDTO } from "../../models/ads/CreateAdDTO";
import { CreateCategoryDTO } from "../../models/ads/CreateCategoryDTO";
import { GetAdsQueryDTO } from "../../models/ads/GetAdsQueryDTO";
import { ModerateAdDTO } from "../../models/ads/ModerateAdDTO";
import { PaginatedAdsDTO } from "../../models/ads/PaginatedAdsDTO";
import { UpdateAdDTO } from "../../models/ads/UpdateAdDTO";

export interface IAdAPI {
  getCategories(): Promise<CategoryDTO[]>;
  createCategory(token: string, data: CreateCategoryDTO): Promise<CategoryDTO>;
  getPublicAds(query?: GetAdsQueryDTO): Promise<PaginatedAdsDTO>;
  getPublicAdById(adId: string): Promise<AdDTO>;
  getAdsForModeration(token: string, query?: GetAdsQueryDTO): Promise<PaginatedAdsDTO>;
  getMyAds(token: string, query?: GetAdsQueryDTO): Promise<PaginatedAdsDTO>;
  createAd(token: string, data: CreateAdDTO): Promise<AdDTO>;
  updateAd(token: string, adId: string, data: UpdateAdDTO): Promise<AdDTO>;
  deleteAd(token: string, adId: string): Promise<void>;
  moderateAd(token: string, adId: string, data: ModerateAdDTO): Promise<AdDTO>;
}
