import axios, { AxiosInstance } from "axios";
import { GetAuditLogsQueryDTO } from "../../models/audit/GetAuditLogsQueryDTO";
import { PaginatedAuditLogsDTO } from "../../models/audit/PaginatedAuditLogsDTO";
import { IAuditAPI } from "./IAuditAPI";

export class AuditAPI implements IAuditAPI {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_GATEWAY_URL,
      headers: { "Content-Type": "application/json" },
    });
  }

  async getLogs(token: string, query?: GetAuditLogsQueryDTO): Promise<PaginatedAuditLogsDTO> {
    return (
      await this.axiosInstance.get<PaginatedAuditLogsDTO>("/audit/logs", {
        params: query,
        headers: { Authorization: `Bearer ${token}` },
      })
    ).data;
  }
}
