import { Request, Response, Router } from "express";
import { CreateAuditLogDTO } from "../../Domain/DTOs/CreateAuditLogDTO";
import { GetAuditLogsQueryDTO } from "../../Domain/DTOs/GetAuditLogsQueryDTO";
import { IAuditService } from "../../Domain/services/IAuditService";

export class AuditController {
  private readonly router: Router;

  constructor(private readonly auditService: IAuditService) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/audit/logs", this.createLog.bind(this));
    this.router.get("/audit/logs", this.getLogs.bind(this));
  }

  private async createLog(req: Request, res: Response): Promise<void> {
    try {
      const log = await this.auditService.createLog(req.body as CreateAuditLogDTO);
      res.status(201).json(log);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const logs = await this.auditService.getLogs(this.toQueryDTO(req));
      res.status(200).json(logs);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  }

  private toQueryDTO(req: Request): GetAuditLogsQueryDTO {
    return {
      page: this.toNumber(req.query.page),
      limit: this.toNumber(req.query.limit),
      userId: this.getSingleValue(req.query.userId),
      action: this.getSingleValue(req.query.action),
      service: this.getSingleValue(req.query.service),
      dateFrom: this.getSingleValue(req.query.dateFrom),
      dateTo: this.getSingleValue(req.query.dateTo),
    };
  }

  private getSingleValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return typeof value[0] === "string" ? value[0] : undefined;
    }

    return typeof value === "string" ? value : undefined;
  }

  private toNumber(value: unknown): number | undefined {
    const normalized = this.getSingleValue(value);
    if (!normalized) return undefined;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  public getRouter(): Router {
    return this.router;
  }
}
