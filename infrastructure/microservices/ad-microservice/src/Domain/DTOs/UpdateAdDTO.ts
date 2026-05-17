export interface UpdateAdDTO {
  title?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  imageUrls?: string[];
  removeExistingImages?: boolean;
}
