export interface RatingDTO {
  id: string;
  transactionId: string;
  reviewerId: string;
  revieweeId: string;
  score: number;
  comment: string;
  createdAt: string;
}
