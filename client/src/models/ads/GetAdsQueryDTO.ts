export interface GetAdsQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: string;
  dateTo?: string;
}
