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
import { createApiError } from "../shared/apiError";

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
    try {
      return (await this.axiosInstance.get<CategoryDTO[]>("/categories")).data;
    } catch (error) {
      throw createApiError(error, "Failed to load categories.");
    }
  }

  async createCategory(token: string, data: CreateCategoryDTO): Promise<CategoryDTO> {
    try {
      return (
        await this.axiosInstance.post<CategoryDTO>("/categories", data, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Category creation failed.");
    }
  }

  async getPublicAds(query?: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    try {
      return (
        await this.axiosInstance.get<PaginatedAdsDTO>("/ads", {
          params: query,
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to load marketplace ads.");
    }
  }

  async getPublicAdById(adId: string): Promise<AdDTO> {
    try {
      return (await this.axiosInstance.get<AdDTO>(`/ads/${adId}`)).data;
    } catch (error) {
      throw createApiError(error, "Failed to load ad details.");
    }
  }

  async getAdsForModeration(token: string, query?: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    try {
      return (
        await this.axiosInstance.get<PaginatedAdsDTO>("/ads/review", {
          params: query,
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to load moderation queue.");
    }
  }

  async getMyAds(token: string, query?: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    try {
      return (
        await this.axiosInstance.get<PaginatedAdsDTO>("/ads/me", {
          params: query,
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to load your ads.");
    }
  }

  async createAd(token: string, data: CreateAdDTO): Promise<AdDTO> {
    const formData = this.buildAdFormData(data);
    try {
      return (
        await this.axiosInstance.post<AdDTO>("/ads", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Ad creation failed.");
    }
  }

  async updateAd(token: string, adId: string, data: UpdateAdDTO): Promise<AdDTO> {
    const formData = this.buildAdFormData(data);
    try {
      return (
        await this.axiosInstance.patch<AdDTO>(`/ads/${adId}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Ad update failed.");
    }
  }

  async deleteAd(token: string, adId: string): Promise<void> {
    try {
      await this.axiosInstance.delete(`/ads/${adId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      throw createApiError(error, "Ad deletion failed.");
    }
  }

  async moderateAd(token: string, adId: string, data: ModerateAdDTO): Promise<AdDTO> {
    try {
      return (
        await this.axiosInstance.patch<AdDTO>(`/ads/${adId}/moderation`, data, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).data;
    } catch (error) {
      throw createApiError(error, "Failed to save moderation decision.");
    }
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
