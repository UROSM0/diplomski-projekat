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

type TransactionWithRatings = Transaction & {
  ratings: Rating[];
};

export class TransactionsService implements ITransactionsService {
  private readonly userClient: AxiosInstance;
  private readonly adClient: AxiosInstance;

  constructor(private readonly prisma: PrismaClient) {
    this.userClient = axios.create({
      baseURL: process.env.USER_SERVICE_URL ?? process.env.USER_SERVICE_API,
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    this.adClient = axios.create({
      baseURL: process.env.AD_SERVICE_URL ?? process.env.AD_SERVICE_API,
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
      include: { ratings: true },
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

    let buyerDebited = false;
    let sellerCredited = false;
    let createdTransactionId: string | undefined;

    try {
      await this.adjustUserBalance(buyerId, -amount);
      buyerDebited = true;

      await this.adjustUserBalance(seller.id, amount);
      sellerCredited = true;

      const transaction = await this.prisma.transaction.create({
        data: {
          adId: ad.id,
          adTitle: ad.title,
          adImageUrl: ad.imageUrls[0] || null,
          buyerId,
          sellerId: seller.id,
          amount,
        },
        include: { ratings: true },
      });
      createdTransactionId = transaction.id;

      await this.updateAdStatus(ad.id, "SOLD");
      return this.toTransactionDTO(transaction);
    } catch (error) {
      const compensationErrors: string[] = [];

      if (createdTransactionId) {
        try {
          await this.prisma.transaction.delete({ where: { id: createdTransactionId } });
        } catch (compensationError) {
          compensationErrors.push(`transaction cleanup failed: ${this.getErrorMessage(compensationError)}`);
        }
      }

      if (sellerCredited) {
        try {
          await this.adjustUserBalance(seller.id, -amount);
        } catch (compensationError) {
          compensationErrors.push(`seller balance rollback failed: ${this.getErrorMessage(compensationError)}`);
        }
      }

      if (buyerDebited) {
        try {
          await this.adjustUserBalance(buyerId, amount);
        } catch (compensationError) {
          compensationErrors.push(`buyer balance rollback failed: ${this.getErrorMessage(compensationError)}`);
        }
      }

      if (compensationErrors.length > 0) {
        throw new Error(
          `${this.getErrorMessage(error)} Compensation was incomplete: ${compensationErrors.join("; ")}`
        );
      }

      throw error;
    }
  }

  async getPurchases(buyerId: string): Promise<TransactionDTO[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { buyerId },
      include: { ratings: true },
      orderBy: { createdAt: "desc" },
    });

    return transactions.map((transaction) => this.toTransactionDTO(transaction));
  }

  async getSales(sellerId: string): Promise<TransactionDTO[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { sellerId },
      include: { ratings: true },
      orderBy: { createdAt: "desc" },
    });

    return transactions.map((transaction) => this.toTransactionDTO(transaction));
  }

  async rateTransaction(transactionId: string, reviewerId: string, data: CreateRatingDTO): Promise<TransactionDTO> {
    if (!transactionId?.trim()) {
      throw new Error("Transaction id is required.");
    }

    if (!reviewerId?.trim()) {
      throw new Error("Reviewer id is required.");
    }

    if (!Number.isInteger(data.score) || data.score < 1 || data.score > 5) {
      throw new Error("Rating score must be between 1 and 5.");
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { ratings: true },
    });

    if (!transaction) {
      throw new Error("Transaction not found.");
    }

    if (transaction.buyerId !== reviewerId && transaction.sellerId !== reviewerId) {
      throw new Error("Only transaction participants can rate this transaction.");
    }

    if (transaction.ratings.some((rating) => rating.reviewerId === reviewerId)) {
      throw new Error("You have already rated this transaction.");
    }

    const revieweeId = transaction.buyerId === reviewerId ? transaction.sellerId : transaction.buyerId;
    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ratings: {
          create: {
            reviewerId,
            revieweeId,
            score: data.score,
            comment: data.comment?.trim() || null,
          },
        },
      },
      include: { ratings: true },
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

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private toTransactionDTO(transaction: TransactionWithRatings): TransactionDTO {
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
      ratings: transaction.ratings.map((rating) => this.toRatingDTO(rating)),
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
