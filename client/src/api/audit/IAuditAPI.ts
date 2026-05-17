import { GetAuditLogsQueryDTO } from "../../models/audit/GetAuditLogsQueryDTO";
import { PaginatedAuditLogsDTO } from "../../models/audit/PaginatedAuditLogsDTO";

export interface IAuditAPI {
  getLogs(token: string, query?: GetAuditLogsQueryDTO): Promise<PaginatedAuditLogsDTO>;
}
