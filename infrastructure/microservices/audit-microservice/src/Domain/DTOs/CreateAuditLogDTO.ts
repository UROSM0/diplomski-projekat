export interface CreateAuditLogDTO {
  userId?: string | null;
  action: string;
  service: string;
  description: string;
  metadata?: Record<string, unknown> | null;
}
