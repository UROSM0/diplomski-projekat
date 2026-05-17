import { AuditLogDTO } from "../DTOs/AuditLogDTO";
import { CreateAuditLogDTO } from "../DTOs/CreateAuditLogDTO";
import { GetAuditLogsQueryDTO } from "../DTOs/GetAuditLogsQueryDTO";
import { PaginatedAuditLogsDTO } from "../DTOs/PaginatedAuditLogsDTO";

export interface IAuditService {
  createLog(data: CreateAuditLogDTO): Promise<AuditLogDTO>;
  getLogs(query: GetAuditLogsQueryDTO): Promise<PaginatedAuditLogsDTO>;
}
