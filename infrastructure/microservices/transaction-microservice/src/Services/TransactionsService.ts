import axios, { AxiosInstance } from "axios";
import { PrismaClient, Rating, Transaction } from "@prisma/client";
import { CreateRatingDTO } from "../Domain/DTOs/CreateRatingDTO";
import { PurchaseTransactionDTO } from "../Domain/DTOs/PurchaseTransactionDTO";
import { RatingDTO } from "../Domain/DTOs/RatingDTO";
import { TransactionDTO } from "../Domain/DTOs/TransactionDTO";
import { ITransactionsService } from "../Domain/services/ITransactionsService";

type InternalUserDTO = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  balance: number;
  profileImage: string;
};

type InternalAdDTO = {
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
  category: {
    id: string;
    name: string;
    description: string;
  } | null;
};

type TransactionWithRating = Transaction & {
  rating: Rating | null;
};

export class TransactionsService implements ITransactionsService {
  private readonly userClient: AxiosInstance;
  private readonly adClient: AxiosInstance;

  constructor(private readonly prisma: PrismaClient) {
    this.userClient = axios.create({
      baseURL: process.env.USER_SERVICE_URL,
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    this.adClient = axios.create({
      baseURL: process.env.AD_SERVICE_URL,
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });
  }

  async purchaseAd(buyerId: string, data: PurchaseTransactionDTO): Promise<TransactionDTO> {
    if (!buyerId?.trim()) {
      throw new Error("Buyer id is required.");
    }

    if (!data.adId?.trim()) {
      throw new Error("Ad id is required.");
    }

    const existingTransaction = await this.prisma.transaction.findUnique({
      where: { adId: data.adId },
      include: { rating: true },
    });

    if (existingTransaction) {
      throw new Error("This ad has already been purchased.");
    }

    const ad = await this.getInternalAd(data.adId);
    if (ad.status !== "APPROVED") {
      throw new Error("This ad is not available for purchase.");
    }

    if (ad.sellerId === buyerId) {
      throw new Error("You cannot purchase your own ad.");
    }

    const buyer = await this.getInternalUser(buyerId);
    const seller = await this.getInternalUser(ad.sellerId);
    const amount = Number(ad.price);

    if (buyer.status !== "ACTIVE") {
      throw new Error("Your account is not active for purchases.");
    }

    if (seller.status !== "ACTIVE") {
      throw new Error("The seller account is not active.");
    }

    if (buyer.balance < amount) {
      throw new Error("Insufficient wallet balance.");
    }

    await this.adjustUserBalance(buyerId, -amount);

    try {
      await this.adjustUserBalance(seller.id, amount);

      try {
        const transaction = await this.prisma.transaction.create({
          data: {
            adId: ad.id,
            adTitle: ad.title,
            adImageUrl: ad.imageUrls[0] || null,
            buyerId,
            sellerId: seller.id,
            amount,
          },
          include: { rating: true },
        });

        try {
          await this.updateAdStatus(ad.id, "SOLD");
          return this.toTransactionDTO(transaction);
        } catch (error) {
          await this.prisma.transaction.delete({ where: { id: transaction.id } }).catch(() => undefined);
          await this.adjustUserBalance(seller.id, -amount).catch(() => undefined);
          await this.adjustUserBalance(buyerId, amount).catch(() => undefined);
          throw error;
        }
      } catch (error) {
        await this.adjustUserBalance(seller.id, -amount).catch(() => undefined);
        await this.adjustUserBalance(buyerId, amount).catch(() => undefined);
        throw error;
      }
    } catch (error) {
      await this.adjustUserBalance(buyerId, amount).catch(() => undefined);
      throw error;
    }
  }

  async getPurchases(buyerId: string): Promise<TransactionDTO[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { buyerId },
      include: { rating: true },
      orderBy: { createdAt: "desc" },
    });

    return transactions.map((transaction) => this.toTransactionDTO(transaction));
  }

  async getSales(sellerId: string): Promise<TransactionDTO[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { sellerId },
      include: { rating: true },
      orderBy: { createdAt: "desc" },
    });

    return transactions.map((transaction) => this.toTransactionDTO(transaction));
  }

  async rateTransaction(transactionId: string, buyerId: string, data: CreateRatingDTO): Promise<TransactionDTO> {
    if (!transactionId?.trim()) {
      throw new Error("Transaction id is required.");
    }

    if (!buyerId?.trim()) {
      throw new Error("Buyer id is required.");
    }

    if (!Number.isInteger(data.score) || data.score < 1 || data.score > 5) {
      throw new Error("Rating score must be between 1 and 5.");
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { rating: true },
    });

    if (!transaction) {
      throw new Error("Transaction not found.");
    }

    if (transaction.buyerId !== buyerId) {
      throw new Error("Only the buyer can rate this transaction.");
    }

    if (transaction.rating) {
      throw new Error("This transaction has already been rated.");
    }

    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        rating: {
          create: {
            reviewerId: buyerId,
            revieweeId: transaction.sellerId,
            score: data.score,
            comment: data.comment?.trim() || null,
          },
        },
      },
      include: { rating: true },
    });

    return this.toTransactionDTO(updatedTransaction);
  }

  private async getInternalUser(userId: string): Promise<InternalUserDTO> {
    const response = await this.userClient.get<InternalUserDTO>(`/users/${userId}`);
    return response.data;
  }

  private async adjustUserBalance(userId: string, amount: number): Promise<InternalUserDTO> {
    const response = await this.userClient.post<InternalUserDTO>(`/internal/users/${userId}/balance-adjustment`, {
      amount,
    });
    return response.data;
  }

  private async getInternalAd(adId: string): Promise<InternalAdDTO> {
    const response = await this.adClient.get<InternalAdDTO>(`/internal/ads/${adId}`);
    return response.data;
  }

  private async updateAdStatus(adId: string, status: string): Promise<InternalAdDTO> {
    const response = await this.adClient.patch<InternalAdDTO>(`/internal/ads/${adId}/status`, {
      status,
    });
    return response.data;
  }

  private toTransactionDTO(transaction: TransactionWithRating): TransactionDTO {
    return {
      id: transaction.id,
      adId: transaction.adId,
      adTitle: transaction.adTitle,
      adImageUrl: transaction.adImageUrl ?? "",
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
      amount: Number(transaction.amount),
      status: transaction.status,
      createdAt: transaction.createdAt.toISOString(),
      rating: transaction.rating ? this.toRatingDTO(transaction.rating) : null,
    };
  }

  private toRatingDTO(rating: Rating): RatingDTO {
    return {
      id: rating.id,
      transactionId: rating.transactionId,
      reviewerId: rating.reviewerId,
      revieweeId: rating.revieweeId,
      score: rating.score,
      comment: rating.comment ?? "",
      createdAt: rating.createdAt.toISOString(),
    };
  }
}
