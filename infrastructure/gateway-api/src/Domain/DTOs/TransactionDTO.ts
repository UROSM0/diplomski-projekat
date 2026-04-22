import { RatingDTO } from "./RatingDTO";

export interface TransactionDTO {
  id: string;
  adId: string;
  adTitle: string;
  adImageUrl: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: string;
  createdAt: string;
  rating: RatingDTO | null;
}
