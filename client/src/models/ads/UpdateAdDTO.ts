export interface UpdateAdDTO {
  title?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  images?: File[];
  removeExistingImages?: boolean;
}
