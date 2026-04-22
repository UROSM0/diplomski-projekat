import { CreateRatingDTO } from "../../models/transactions/CreateRatingDTO";
import { PurchaseTransactionDTO } from "../../models/transactions/PurchaseTransactionDTO";
import { TransactionDTO } from "../../models/transactions/TransactionDTO";

export interface ITransactionAPI {
  purchaseAd(token: string, data: PurchaseTransactionDTO): Promise<TransactionDTO>;
  getMyPurchases(token: string): Promise<TransactionDTO[]>;
  getMySales(token: string): Promise<TransactionDTO[]>;
  createRating(token: string, transactionId: string, data: CreateRatingDTO): Promise<TransactionDTO>;
}
