import React, { useEffect, useState } from "react";
import { IAuditAPI } from "../api/audit/IAuditAPI";
import { getErrorMessage } from "../api/shared/apiError";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { AuditLogDTO } from "../models/audit/AuditLogDTO";

type AuditLogsPageProps = {
  auditAPI: IAuditAPI;
  userAPI: IUserAPI;
};

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ auditAPI, userAPI }) => {
  const { token, user: authUser } = useAuth();
  const isAdmin = authUser?.role?.toUpperCase() === "ADMIN";
  const [auditLogs, setAuditLogs] = useState<AuditLogDTO[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditServiceFilter, setAuditServiceFilter] = useState("");
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuditLogs = async () => {
      if (!token || !isAdmin) {
        setAuditLogs([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPageError("");

      try {
        const result = await auditAPI.getLogs(token, {
          page: 1,
          limit: 20,
          action: auditActionFilter || undefined,
          service: auditServiceFilter || undefined,
        });
        setAuditLogs(result.items);
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje audit logova nije uspelo."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadAuditLogs();
  }, [auditAPI, auditActionFilter, auditServiceFilter, isAdmin, token]);

  return (
    <div className="page-shell">
      <DashboardNavbar userAPI={userAPI} activePage="audit" />

      <main className="page-main" style={{ maxWidth: "1160px" }}>
        <section className="card page-hero" style={{ marginBottom: "24px" }}>
          <div className="hero-kicker">Administracija</div>
          <h1 style={{ marginBottom: "12px" }}>Evidencija aktivnosti</h1>
        </section>

        <section className="card" style={{ marginBottom: "24px" }}>
          <div className="section-heading">
            <div>
              <h2 style={{ marginBottom: "8px" }}>Filteri</h2>
            </div>
            <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Akcija"
                value={auditActionFilter}
                onChange={(event) => setAuditActionFilter(event.target.value)}
                style={{ maxWidth: "180px" }}
              />
              <input
                type="text"
                placeholder="Servis"
                value={auditServiceFilter}
                onChange={(event) => setAuditServiceFilter(event.target.value)}
                style={{ maxWidth: "180px" }}
              />
            </div>
          </div>

          {pageError ? <p style={{ marginBottom: 0 }}>{pageError}</p> : null}
        </section>

        <section className="card">
          {isLoading ? (
            <p style={{ marginBottom: 0 }}>Ucavanje audit logova...</p>
          ) : auditLogs.length ? (
            <div className="flex flex-col gap-3">
              {auditLogs.map((log) => (
                <article
                  key={log.id}
                  className="card"
                  style={{ background: "var(--win11-surface-subtle)", padding: "16px" }}
                >
                  <div className="flex justify-between gap-3" style={{ flexWrap: "wrap" }}>
                    <div>
                      <strong>{log.action}</strong>
                      <p style={{ margin: "6px 0" }}>{log.description}</p>
                      <p style={{ marginBottom: 0, color: "var(--win11-text-tertiary)" }}>
                        {log.service} {log.userId ? `- ${log.userId}` : ""}
                      </p>
                    </div>
                    <span style={{ color: "var(--win11-text-tertiary)", fontSize: "12px" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ marginBottom: 0 }}>Nema audit logova za prikazane filtere.</p>
          )}
        </section>
      </main>
    </div>
  );
};
