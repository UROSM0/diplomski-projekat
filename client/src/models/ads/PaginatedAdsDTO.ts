import { AdDTO } from "./AdDTO";

export interface PaginatedAdsDTO {
  items: AdDTO[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}
