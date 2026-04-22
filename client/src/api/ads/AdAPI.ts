import axios, { AxiosInstance } from "axios";
import { IAdAPI } from "./IAdAPI";
import { AdDTO } from "../../models/ads/AdDTO";
import { CategoryDTO } from "../../models/ads/CategoryDTO";
import { CreateAdDTO } from "../../models/ads/CreateAdDTO";
import { CreateCategoryDTO } from "../../models/ads/CreateCategoryDTO";
import { GetAdsQueryDTO } from "../../models/ads/GetAdsQueryDTO";
import { ModerateAdDTO } from "../../models/ads/ModerateAdDTO";
import { PaginatedAdsDTO } from "../../models/ads/PaginatedAdsDTO";
import { UpdateAdDTO } from "../../models/ads/UpdateAdDTO";

export class AdAPI implements IAdAPI {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_GATEWAY_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async getCategories(): Promise<CategoryDTO[]> {
    return (await this.axiosInstance.get<CategoryDTO[]>("/categories")).data;
  }

  async createCategory(token: string, data: CreateCategoryDTO): Promise<CategoryDTO> {
    return (
      await this.axiosInstance.post<CategoryDTO>("/categories", data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async getPublicAds(query?: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    return (
      await this.axiosInstance.get<PaginatedAdsDTO>("/ads", {
        params: query,
      })
    ).data;
  }

  async getPublicAdById(adId: string): Promise<AdDTO> {
    return (await this.axiosInstance.get<AdDTO>(`/ads/${adId}`)).data;
  }

  async getAdsForModeration(token: string, query?: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    return (
      await this.axiosInstance.get<PaginatedAdsDTO>("/ads/review", {
        params: query,
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async getMyAds(token: string, query?: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    return (
      await this.axiosInstance.get<PaginatedAdsDTO>("/ads/me", {
        params: query,
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async createAd(token: string, data: CreateAdDTO): Promise<AdDTO> {
    return (
      await this.axiosInstance.post<AdDTO>("/ads", data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async updateAd(token: string, adId: string, data: UpdateAdDTO): Promise<AdDTO> {
    return (
      await this.axiosInstance.patch<AdDTO>(`/ads/${adId}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async deleteAd(token: string, adId: string): Promise<void> {
    await this.axiosInstance.delete(`/ads/${adId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async moderateAd(token: string, adId: string, data: ModerateAdDTO): Promise<AdDTO> {
    return (
      await this.axiosInstance.patch<AdDTO>(`/ads/${adId}/moderation`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }
}
