export interface GetAuditLogsQueryDTO {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  service?: string;
  dateFrom?: string;
  dateTo?: string;
}
