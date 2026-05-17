export interface CreateAdDTO {
  title: string;
  description: string;
  price: number;
  categoryId: string;
  images?: File[];
}
