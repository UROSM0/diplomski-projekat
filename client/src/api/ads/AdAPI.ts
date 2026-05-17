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
    const formData = this.buildAdFormData(data);
    return (
      await this.axiosInstance.post<AdDTO>("/ads", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
    ).data;
  }

  async updateAd(token: string, adId: string, data: UpdateAdDTO): Promise<AdDTO> {
    const formData = this.buildAdFormData(data);
    return (
      await this.axiosInstance.patch<AdDTO>(`/ads/${adId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
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

  private buildAdFormData(data: CreateAdDTO | UpdateAdDTO): FormData {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (key === "images" || value === undefined || value === null) {
        return;
      }

      formData.append(key, String(value));
    });

    data.images?.forEach((image) => {
      formData.append("images", image);
    });

    return formData;
  }
}
