export interface CreateAdDTO {
  sellerId: string;
  title: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrls?: string[];
}
