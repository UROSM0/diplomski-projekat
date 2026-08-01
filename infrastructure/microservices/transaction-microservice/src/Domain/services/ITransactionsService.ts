import { CreateRatingDTO } from "../DTOs/CreateRatingDTO";
import { PurchaseTransactionDTO } from "../DTOs/PurchaseTransactionDTO";
import { TransactionDTO } from "../DTOs/TransactionDTO";

export interface ITransactionsService {
  purchaseAd(buyerId: string, data: PurchaseTransactionDTO): Promise<TransactionDTO>;
  getPurchases(buyerId: string): Promise<TransactionDTO[]>;
  getSales(sellerId: string): Promise<TransactionDTO[]>;
  rateTransaction(transactionId: string, reviewerId: string, data: CreateRatingDTO): Promise<TransactionDTO>;
}
