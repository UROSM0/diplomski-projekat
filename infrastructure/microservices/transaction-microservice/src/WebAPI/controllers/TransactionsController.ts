import { Request, Response, Router } from "express";
import { CreateRatingDTO } from "../../Domain/DTOs/CreateRatingDTO";
import { PurchaseTransactionDTO } from "../../Domain/DTOs/PurchaseTransactionDTO";
import { ILogerService } from "../../Domain/services/ILogerService";
import { ITransactionsService } from "../../Domain/services/ITransactionsService";

export class TransactionsController {
  private readonly router: Router;

  constructor(
    private readonly transactionsService: ITransactionsService,
    private readonly logger: ILogerService
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/transactions/purchase", this.purchaseAd.bind(this));
    this.router.get("/transactions/buyer/:buyerId", this.getPurchases.bind(this));
    this.router.get("/transactions/seller/:sellerId", this.getSales.bind(this));
    this.router.post("/transactions/:id/rating", this.rateTransaction.bind(this));
  }

  private async purchaseAd(req: Request, res: Response): Promise<void> {
    try {
      const buyerId = this.getSingleValue(req.body?.buyerId);
      if (!buyerId) {
        res.status(400).json({ message: "Buyer id is required." });
        return;
      }

      const { buyerId: _buyerId, ...payload } = req.body as PurchaseTransactionDTO & { buyerId?: string };
      const transaction = await this.transactionsService.purchaseAd(buyerId, payload);
      res.status(201).json(transaction);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getPurchases(req: Request, res: Response): Promise<void> {
    try {
      const buyerId = this.getSingleValue(req.params.buyerId);
      if (!buyerId) {
        res.status(400).json({ message: "Buyer id is required." });
        return;
      }

      const transactions = await this.transactionsService.getPurchases(buyerId);
      res.status(200).json(transactions);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getSales(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = this.getSingleValue(req.params.sellerId);
      if (!sellerId) {
        res.status(400).json({ message: "Seller id is required." });
        return;
      }

      const transactions = await this.transactionsService.getSales(sellerId);
      res.status(200).json(transactions);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async rateTransaction(req: Request, res: Response): Promise<void> {
    try {
      const transactionId = this.getSingleValue(req.params.id);
      const reviewerId = this.getSingleValue(req.body?.reviewerId);

      if (!transactionId || !reviewerId) {
        res.status(400).json({ message: "Transaction id and reviewer id are required." });
        return;
      }

      const { reviewerId: _reviewerId, ...payload } = req.body as CreateRatingDTO & { reviewerId?: string };
      const transaction = await this.transactionsService.rateTransaction(transactionId, reviewerId, payload);
      res.status(200).json(transaction);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private getSingleValue(value: unknown): string | null {
    if (Array.isArray(value)) {
      return typeof value[0] === "string" && value[0].trim() ? value[0] : null;
    }

    return typeof value === "string" && value.trim() ? value : null;
  }

  public getRouter(): Router {
    return this.router;
  }
}
