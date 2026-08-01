import fs from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import { AdDTO } from "../Domain/DTOs/AdDTO";
import { CategoryDTO } from "../Domain/DTOs/CategoryDTO";
import { CreateAdDTO } from "../Domain/DTOs/CreateAdDTO";
import { CreateCategoryDTO } from "../Domain/DTOs/CreateCategoryDTO";
import { GetAdsQueryDTO } from "../Domain/DTOs/GetAdsQueryDTO";
import { ModerateAdDTO } from "../Domain/DTOs/ModerateAdDTO";
import { PaginatedAdsDTO } from "../Domain/DTOs/PaginatedAdsDTO";
import { UpdateAdStatusDTO } from "../Domain/DTOs/UpdateAdStatusDTO";
import { UpdateAdDTO } from "../Domain/DTOs/UpdateAdDTO";
import { IAdsService } from "../Domain/services/IAdsService";

const AD_STATUSES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SOLD: "SOLD",
} as const;

type AdStatusValue = (typeof AD_STATUSES)[keyof typeof AD_STATUSES];

type AdWithRelations = {
  id: string;
  title: string;
  description: string;
  price: { toString(): string };
  sellerId: string;
  categoryId: string;
  status: string;
  moderationNote: string | null;
  moderatedById: string | null;
  moderatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  images: Array<{
    imageUrl: string;
  }>;
};

export class AdsService implements IAdsService {
  constructor(private readonly prisma: PrismaClient) {}

  private readonly adInclude = {
    category: true,
    images: {
      orderBy: { displayOrder: "asc" as const },
    },
  };

  async getCategories(): Promise<CategoryDTO[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return categories.map((category) => this.toCategoryDTO(category));
  }

  async createCategory(data: CreateCategoryDTO): Promise<CategoryDTO> {
    const name = data.name?.trim();
    if (!name) {
      throw new Error("Category name is required.");
    }

    const category = await this.prisma.category.create({
      data: {
        name,
        description: data.description?.trim() || null,
      },
    });

    return this.toCategoryDTO(category);
  }

  async createAd(data: CreateAdDTO): Promise<AdDTO> {
    this.validateAdPayload(data);
    await this.ensureCategoryExists(data.categoryId);

    const ad = await this.prisma.ad.create({
      data: {
        title: data.title.trim(),
        description: data.description.trim(),
        price: data.price,
        sellerId: data.sellerId,
        categoryId: data.categoryId,
        images: {
          create: this.toImageCreateInputs(data.imageUrls),
        },
      },
      include: this.adInclude,
    });

    return this.toAdDTO(ad);
  }

  async getPublicAds(query: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    return this.getAdsWithPagination({
      query,
      filters: {
        status: AD_STATUSES.APPROVED,
      },
    });
  }

  async getAdsForModeration(query: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    return this.getAdsWithPagination({
      query,
      filters: {
        status: query.status ? this.normalizeStatus(query.status) : AD_STATUSES.PENDING,
      },
    });
  }

  async getPublicAdById(id: string): Promise<AdDTO> {
    const ad = await this.prisma.ad.findFirst({
      where: {
        id,
        status: AD_STATUSES.APPROVED,
      },
      include: this.adInclude,
    });

    if (!ad) {
      throw new Error("Ad not found.");
    }

    return this.toAdDTO(ad);
  }

  async getAdByIdInternal(id: string): Promise<AdDTO> {
    const ad = await this.prisma.ad.findUnique({
      where: { id },
      include: this.adInclude,
    });

    if (!ad) {
      throw new Error("Ad not found.");
    }

    return this.toAdDTO(ad as AdWithRelations);
  }

  async getAdsBySeller(sellerId: string, query: GetAdsQueryDTO): Promise<PaginatedAdsDTO> {
    if (!sellerId?.trim()) {
      throw new Error("Seller id is required.");
    }

    return this.getAdsWithPagination({
      query,
      filters: {
        sellerId,
        status: query.status ? this.normalizeStatus(query.status) : undefined,
      },
    });
  }

  async updateAd(adId: string, sellerId: string, data: UpdateAdDTO): Promise<AdDTO> {
    const existingAd = await this.getOwnedAdOrThrow(adId, sellerId, "edit");

    if (data.categoryId) {
      await this.ensureCategoryExists(data.categoryId);
    }

    const updatedAd = await this.prisma.ad.update({
      where: { id: adId },
      data: {
        title: data.title?.trim() || existingAd.title,
        description: data.description?.trim() || existingAd.description,
        price:
          typeof data.price === "number" && Number.isFinite(data.price) && data.price > 0
            ? data.price
            : Number(existingAd.price.toString()),
        categoryId: data.categoryId || existingAd.categoryId,
        status: AD_STATUSES.PENDING,
        moderationNote: null,
        moderatedById: null,
        moderatedAt: null,
        ...(data.imageUrls || data.removeExistingImages
          ? {
              images: {
                deleteMany: {},
                create: this.toImageCreateInputs(data.imageUrls),
              },
            }
          : {}),
      },
      include: this.adInclude,
    });

    if (data.imageUrls || data.removeExistingImages) {
      await this.deleteStoredImages(existingAd.images.map((image) => image.imageUrl));
    }

    return this.toAdDTO(updatedAd);
  }

  async deleteAd(adId: string, sellerId: string): Promise<void> {
    const ad = await this.getOwnedAdOrThrow(adId, sellerId, "delete");

    await this.prisma.ad.delete({
      where: { id: adId },
    });

    await this.deleteStoredImages(ad.images.map((image) => image.imageUrl));
  }

  async moderateAd(adId: string, data: ModerateAdDTO): Promise<AdDTO> {
    if (!data.moderatorId?.trim()) {
      throw new Error("Moderator id is required.");
    }

    const normalizedStatus = this.normalizeStatus(data.status);
    if (normalizedStatus !== AD_STATUSES.APPROVED && normalizedStatus !== AD_STATUSES.REJECTED) {
      throw new Error("Moderation can only set APPROVED or REJECTED status.");
    }

    const moderationNote = data.moderationNote?.trim();
    if (normalizedStatus === AD_STATUSES.REJECTED && !moderationNote) {
      throw new Error("Moderation note is required when rejecting an ad.");
    }

    const existingAd = await this.prisma.ad.findUnique({
      where: { id: adId },
    });

    if (!existingAd) {
      throw new Error("Ad not found.");
    }

    const updatedAd = await this.prisma.ad.update({
      where: { id: adId },
      data: {
        status: normalizedStatus,
        moderationNote: moderationNote || null,
        moderatedById: data.moderatorId,
        moderatedAt: new Date(),
      },
      include: this.adInclude,
    });

    return this.toAdDTO(updatedAd);
  }

  async updateAdStatusInternal(adId: string, data: UpdateAdStatusDTO): Promise<AdDTO> {
    const existingAd = await this.prisma.ad.findUnique({
      where: { id: adId },
    });

    if (!existingAd) {
      throw new Error("Ad not found.");
    }

    const updatedAd = await this.prisma.ad.update({
      where: { id: adId },
      data: {
        status: this.normalizeStatus(data.status),
      },
      include: this.adInclude,
    });

    return this.toAdDTO(updatedAd);
  }

  private async getAdsWithPagination({
    query,
    filters,
  }: {
    query: GetAdsQueryDTO;
    filters: {
      sellerId?: string;
      status?: AdStatusValue;
    };
  }): Promise<PaginatedAdsDTO> {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const skip = (page - 1) * limit;
    const price = this.toPriceFilter(query);
    const createdAt = this.toCreatedAtFilter(query);

    const where: Prisma.AdWhereInput = {
      ...(filters.sellerId ? { sellerId: filters.sellerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" as const } },
              { description: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(price ? { price } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.ad.findMany({
        where,
        include: this.adInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.ad.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toAdDTO(item)),
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    };
  }

  private validateAdPayload(data: CreateAdDTO): void {
    if (!data.sellerId?.trim()) {
      throw new Error("Seller id is required.");
    }

    if (!data.title?.trim()) {
      throw new Error("Ad title is required.");
    }

    if (!data.description?.trim()) {
      throw new Error("Ad description is required.");
    }

    if (!data.categoryId?.trim()) {
      throw new Error("Category is required.");
    }

    if (!Number.isFinite(data.price) || data.price <= 0) {
      throw new Error("Price must be greater than zero.");
    }
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new Error("Category not found.");
    }
  }

  private async getOwnedAdOrThrow(
    adId: string,
    sellerId: string,
    action: "edit" | "delete"
  ): Promise<AdWithRelations> {
    const ad = await this.prisma.ad.findUnique({
      where: { id: adId },
      include: this.adInclude,
    });

    if (!ad) {
      throw new Error("Ad not found.");
    }

    if (ad.sellerId !== sellerId) {
      throw new Error(`You can only ${action} your own ads.`);
    }

    return ad as AdWithRelations;
  }

  private normalizePage(page?: number): number {
    if (!page || !Number.isFinite(page) || page < 1) return 1;
    return Math.floor(page);
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || !Number.isFinite(limit) || limit < 1) return 10;
    return Math.min(50, Math.floor(limit));
  }

  private toPriceFilter(query: GetAdsQueryDTO): Prisma.DecimalFilter | undefined {
    const { minPrice, maxPrice } = query;

    if (minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) {
      throw new Error("Minimum price must be zero or greater.");
    }

    if (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
      throw new Error("Maximum price must be zero or greater.");
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new Error("Minimum price cannot be greater than maximum price.");
    }

    if (minPrice === undefined && maxPrice === undefined) {
      return undefined;
    }

    return {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }

  private toCreatedAtFilter(query: GetAdsQueryDTO): Prisma.DateTimeFilter | undefined {
    const dateFrom = query.dateFrom ? this.parseFilterDate(query.dateFrom, false) : undefined;
    const dateTo = query.dateTo ? this.parseFilterDate(query.dateTo, true) : undefined;

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new Error("Start date cannot be after end date.");
    }

    if (!dateFrom && !dateTo) {
      return undefined;
    }

    return {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  private parseFilterDate(value: string, endOfDay: boolean): Date {
    const normalized = value.trim();
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
    const parsed = new Date(dateOnly ? `${normalized}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z` : normalized);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid ad date filter.");
    }

    return parsed;
  }

  private normalizeStatus(status: string): AdStatusValue {
    const normalizedStatus = status.trim().toUpperCase();

    if (normalizedStatus === AD_STATUSES.PENDING) return AD_STATUSES.PENDING;
    if (normalizedStatus === AD_STATUSES.APPROVED) return AD_STATUSES.APPROVED;
    if (normalizedStatus === AD_STATUSES.REJECTED) return AD_STATUSES.REJECTED;
    if (normalizedStatus === AD_STATUSES.SOLD) return AD_STATUSES.SOLD;

    throw new Error("Invalid ad status.");
  }

  private toImageCreateInputs(imageUrls?: string[]) {
    return (imageUrls ?? [])
      .map((imageUrl) => imageUrl.trim())
      .filter((imageUrl) => imageUrl.length > 0)
      .map((imageUrl, index) => ({
        imageUrl,
        displayOrder: index,
      }));
  }

  private toPublicImageUrl(imageUrl: string): string {
    if (!imageUrl.startsWith("/")) {
      return imageUrl;
    }

    const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? "6854"}`).replace(
      /\/$/,
      ""
    );

    return `${publicBaseUrl}${imageUrl}`;
  }

  private async deleteStoredImages(imageUrls: string[]): Promise<void> {
    const storedImagePaths = imageUrls
      .filter((imageUrl) => imageUrl.startsWith("/uploads/"))
      .map((imageUrl) => imageUrl.replace(/^\/+/, ""))
      .map((relativePath) => path.resolve(process.cwd(), relativePath));

    await Promise.all(
      storedImagePaths.map(async (fullPath) => {
        try {
          await fs.promises.unlink(fullPath);
        } catch {
          // Best-effort cleanup for local upload files.
        }
      })
    );
  }

  private toCategoryDTO(category: { id: string; name: string; description: string | null }): CategoryDTO {
    return {
      id: category.id,
      name: category.name,
      description: category.description ?? "",
    };
  }

  private toAdDTO(ad: AdWithRelations): AdDTO {
    return {
      id: ad.id,
      title: ad.title,
      description: ad.description,
      price: Number(ad.price),
      sellerId: ad.sellerId,
      categoryId: ad.categoryId,
      status: ad.status,
      moderationNote: ad.moderationNote ?? "",
      moderatedById: ad.moderatedById ?? "",
      moderatedAt: ad.moderatedAt?.toISOString() ?? "",
      createdAt: ad.createdAt.toISOString(),
      updatedAt: ad.updatedAt.toISOString(),
      imageUrls: ad.images.map((image) => this.toPublicImageUrl(image.imageUrl)),
      category: ad.category ? this.toCategoryDTO(ad.category) : null,
    };
  }
}
