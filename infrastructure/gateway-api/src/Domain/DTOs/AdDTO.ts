import { CategoryDTO } from "./CategoryDTO";

export interface AdDTO {
  id: string;
  title: string;
  description: string;
  price: number;
  sellerId: string;
  categoryId: string;
  status: string;
  moderationNote: string;
  moderatedById: string;
  moderatedAt: string;
  createdAt: string;
  updatedAt: string;
  imageUrls: string[];
  category: CategoryDTO | null;
}
