import { AuditLog, Prisma, PrismaClient } from "@prisma/client";
import { AuditLogDTO } from "../Domain/DTOs/AuditLogDTO";
import { CreateAuditLogDTO } from "../Domain/DTOs/CreateAuditLogDTO";
import { GetAuditLogsQueryDTO } from "../Domain/DTOs/GetAuditLogsQueryDTO";
import { PaginatedAuditLogsDTO } from "../Domain/DTOs/PaginatedAuditLogsDTO";
import { IAuditService } from "../Domain/services/IAuditService";

export class AuditService implements IAuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async createLog(data: CreateAuditLogDTO): Promise<AuditLogDTO> {
    const action = data.action?.trim();
    const service = data.service?.trim();
    const description = data.description?.trim();

    if (!action) throw new Error("Action is required.");
    if (!service) throw new Error("Service is required.");
    if (!description) throw new Error("Description is required.");

    const log = await this.prisma.auditLog.create({
      data: {
        userId: data.userId?.trim() || null,
        action,
        service,
        description,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return this.toDTO(log);
  }

  async getLogs(query: GetAuditLogsQueryDTO): Promise<PaginatedAuditLogsDTO> {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const skip = (page - 1) * limit;
    const where = this.toWhere(query);

    const [items, totalItems] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toDTO(item)),
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    };
  }

  private toWhere(query: GetAuditLogsQueryDTO): Prisma.AuditLogWhereInput {
    return {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: "insensitive" } } : {}),
      ...(query.service ? { service: { contains: query.service, mode: "insensitive" } } : {}),
      ...this.toDateRange(query),
    };
  }

  private toDateRange(query: GetAuditLogsQueryDTO): Prisma.AuditLogWhereInput {
    const createdAt: Prisma.DateTimeFilter = {};

    if (query.dateFrom) {
      const dateFrom = new Date(query.dateFrom);
      if (!Number.isNaN(dateFrom.getTime())) createdAt.gte = dateFrom;
    }

    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      if (!Number.isNaN(dateTo.getTime())) createdAt.lte = dateTo;
    }

    return Object.keys(createdAt).length ? { createdAt } : {};
  }

  private normalizePage(page?: number): number {
    if (!page || !Number.isFinite(page) || page < 1) return 1;
    return Math.floor(page);
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || !Number.isFinite(limit) || limit < 1) return 20;
    return Math.min(100, Math.floor(limit));
  }

  private toDTO(log: AuditLog): AuditLogDTO {
    return {
      id: log.id,
      userId: log.userId,
      action: log.action,
      service: log.service,
      description: log.description,
      metadata: this.toMetadataDTO(log.metadata),
      createdAt: log.createdAt.toISOString(),
    };
  }

  private toMetadataDTO(metadata: Prisma.JsonValue): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }

    return metadata as Record<string, unknown>;
  }
}
