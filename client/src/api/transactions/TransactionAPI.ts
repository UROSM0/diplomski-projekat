import axios, { AxiosInstance } from "axios";
import { ITransactionAPI } from "./ITransactionAPI";
import { CreateRatingDTO } from "../../models/transactions/CreateRatingDTO";
import { PurchaseTransactionDTO } from "../../models/transactions/PurchaseTransactionDTO";
import { TransactionDTO } from "../../models/transactions/TransactionDTO";

export class TransactionAPI implements ITransactionAPI {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_GATEWAY_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async purchaseAd(token: string, data: PurchaseTransactionDTO): Promise<TransactionDTO> {
    return (
      await this.axiosInstance.post<TransactionDTO>("/transactions/purchase", data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async getMyPurchases(token: string): Promise<TransactionDTO[]> {
    return (
      await this.axiosInstance.get<TransactionDTO[]>("/transactions/me/purchases", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async getMySales(token: string): Promise<TransactionDTO[]> {
    return (
      await this.axiosInstance.get<TransactionDTO[]>("/transactions/me/sales", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }

  async createRating(token: string, transactionId: string, data: CreateRatingDTO): Promise<TransactionDTO> {
    return (
      await this.axiosInstance.post<TransactionDTO>(`/transactions/${transactionId}/rating`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }
}
