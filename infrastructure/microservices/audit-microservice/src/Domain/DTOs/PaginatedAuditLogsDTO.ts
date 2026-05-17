import { AuditLogDTO } from "./AuditLogDTO";

export interface PaginatedAuditLogsDTO {
  items: AuditLogDTO[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}
