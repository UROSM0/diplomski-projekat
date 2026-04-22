import { Request, Response, Router } from "express";
import { CreateAdDTO } from "../../Domain/DTOs/CreateAdDTO";
import { CreateCategoryDTO } from "../../Domain/DTOs/CreateCategoryDTO";
import { GetAdsQueryDTO } from "../../Domain/DTOs/GetAdsQueryDTO";
import { ModerateAdDTO } from "../../Domain/DTOs/ModerateAdDTO";
import { UpdateAdStatusDTO } from "../../Domain/DTOs/UpdateAdStatusDTO";
import { UpdateAdDTO } from "../../Domain/DTOs/UpdateAdDTO";
import { IAdsService } from "../../Domain/services/IAdsService";
import { ILogerService } from "../../Domain/services/ILogerService";

export class AdsController {
  private readonly router: Router;

  constructor(
    private readonly adsService: IAdsService,
    private readonly logger: ILogerService
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/internal/ads/:id", this.getInternalAdById.bind(this));
    this.router.patch("/internal/ads/:id/status", this.updateInternalAdStatus.bind(this));
    this.router.get("/categories", this.getCategories.bind(this));
    this.router.post("/categories", this.createCategory.bind(this));

    this.router.get("/ads", this.getAds.bind(this));
    this.router.get("/ads/review", this.getAdsForModeration.bind(this));
    this.router.get("/ads/my/:sellerId", this.getMyAds.bind(this));
    this.router.get("/ads/:id", this.getAdById.bind(this));
    this.router.post("/ads", this.createAd.bind(this));
    this.router.patch("/ads/:id", this.updateAd.bind(this));
    this.router.delete("/ads/:id", this.deleteAd.bind(this));
    this.router.patch("/ads/:id/moderation", this.moderateAd.bind(this));
  }

  private async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.adsService.getCategories();
      res.status(200).json(categories);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(500).json({ message: (err as Error).message });
    }
  }

  private async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as CreateCategoryDTO;
      const category = await this.adsService.createCategory(data);
      res.status(201).json(category);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getAds(req: Request, res: Response): Promise<void> {
    try {
      const query = this.toQueryDTO(req);
      const ads = await this.adsService.getPublicAds(query);
      res.status(200).json(ads);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getAdsForModeration(req: Request, res: Response): Promise<void> {
    try {
      const query = this.toQueryDTO(req);
      const ads = await this.adsService.getAdsForModeration(query);
      res.status(200).json(ads);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getMyAds(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = this.getSingleParam(req.params.sellerId);
      if (!sellerId) {
        res.status(400).json({ message: "Invalid seller id." });
        return;
      }

      const query = this.toQueryDTO(req);
      const ads = await this.adsService.getAdsBySeller(sellerId, query);
      res.status(200).json(ads);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getAdById(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleParam(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid ad id." });
        return;
      }

      const ad = await this.adsService.getPublicAdById(id);
      res.status(200).json(ad);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(404).json({ message: (err as Error).message });
    }
  }

  private async getInternalAdById(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleParam(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid ad id." });
        return;
      }

      const ad = await this.adsService.getAdByIdInternal(id);
      res.status(200).json(ad);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(404).json({ message: (err as Error).message });
    }
  }

  private async createAd(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as CreateAdDTO;
      const ad = await this.adsService.createAd(data);
      res.status(201).json(ad);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async updateAd(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleParam(req.params.id);
      const sellerId = this.getSellerId(req.body);

      if (!id || !sellerId) {
        res.status(400).json({ message: "Ad id and seller id are required." });
        return;
      }

      const { sellerId: _sellerId, ...payload } = req.body as UpdateAdDTO & { sellerId?: string };
      const ad = await this.adsService.updateAd(id, sellerId, payload);
      res.status(200).json(ad);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async deleteAd(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleParam(req.params.id);
      const sellerId = this.getSellerId(req.body);

      if (!id || !sellerId) {
        res.status(400).json({ message: "Ad id and seller id are required." });
        return;
      }

      await this.adsService.deleteAd(id, sellerId);
      res.status(204).send();
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async moderateAd(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleParam(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid ad id." });
        return;
      }

      const data = req.body as ModerateAdDTO;
      const ad = await this.adsService.moderateAd(id, data);
      res.status(200).json(ad);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async updateInternalAdStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getSingleParam(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Invalid ad id." });
        return;
      }

      const data = req.body as UpdateAdStatusDTO;
      const ad = await this.adsService.updateAdStatusInternal(id, data);
      res.status(200).json(ad);
    } catch (err) {
      this.logger.log((err as Error).message);
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private toQueryDTO(req: Request): GetAdsQueryDTO {
    return {
      page: this.toNumber(req.query.page),
      limit: this.toNumber(req.query.limit),
      search: this.getSingleQuery(req.query.search),
      categoryId: this.getSingleQuery(req.query.categoryId),
      status: this.getSingleQuery(req.query.status),
    };
  }

  private getSellerId(body: unknown): string | null {
    if (typeof body !== "object" || body === null) return null;
    const sellerId = (body as { sellerId?: unknown }).sellerId;
    return typeof sellerId === "string" && sellerId.trim() ? sellerId : null;
  }

  private getSingleParam(value: string | string[] | undefined): string | null {
    const normalized = Array.isArray(value) ? value[0] : value;
    return normalized?.trim() ? normalized : null;
  }

  private getSingleQuery(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return typeof value[0] === "string" ? value[0] : undefined;
    }

    return typeof value === "string" ? value : undefined;
  }

  private toNumber(value: unknown): number | undefined {
    const normalized = this.getSingleQuery(value);
    if (!normalized) return undefined;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  public getRouter(): Router {
    return this.router;
  }
}
