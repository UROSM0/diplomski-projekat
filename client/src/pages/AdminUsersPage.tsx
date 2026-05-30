import React, { useEffect, useState } from "react";
import { getErrorMessage } from "../api/shared/apiError";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { UpdateUserAccessDTO } from "../models/users/UpdateUserAccessDTO";
import { UserDTO } from "../models/users/UserDTO";
import { formatRoleLabel, formatUserStatusLabel } from "../utils/userDisplay";

type AdminUsersPageProps = {
  userAPI: IUserAPI;
};

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ userAPI }) => {
  const { token, user: authUser } = useAuth();
  const isAdmin = authUser?.role?.toUpperCase() === "ADMIN";
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [accessDrafts, setAccessDrafts] = useState<Record<string, UpdateUserAccessDTO>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      if (!token || !isAdmin) {
        setUsers([]);
        setAccessDrafts({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPageError("");

      try {
        const loadedUsers = await userAPI.getAllUsers(token);
        setUsers(loadedUsers);
        setAccessDrafts(
          loadedUsers.reduce<Record<string, UpdateUserAccessDTO>>((drafts, currentUser) => {
            drafts[currentUser.id] = {
              role: currentUser.role,
              status: currentUser.status,
            };
            return drafts;
          }, {})
        );
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje korisnika nije uspelo."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, [isAdmin, token, userAPI]);

  const handleAccessDraftChange = (
    userId: string,
    field: keyof UpdateUserAccessDTO,
    value: string
  ) => {
    setAccessDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {}),
        [field]: value,
      },
    }));
  };

  const handleAccessSave = async (targetUserId: string) => {
    if (!token) {
      return;
    }

    setActionMessage("");

    try {
      const updatedUser = await userAPI.updateUserAccess(token, targetUserId, accessDrafts[targetUserId] ?? {});
      setUsers((current) =>
        current.map((listedUser) => (listedUser.id === targetUserId ? updatedUser : listedUser))
      );
      setAccessDrafts((current) => ({
        ...current,
        [targetUserId]: {
          role: updatedUser.role,
          status: updatedUser.status,
        },
      }));
      setActionMessage(`Pristup je azuriran za korisnika ${updatedUser.username}.`);
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Izmena pristupa nije uspela."));
    }
  };

  return (
    <div className="page-shell">
      <DashboardNavbar userAPI={userAPI} activePage="admin-users" />

      <main className="page-main" style={{ maxWidth: "1160px" }}>
        <section className="card page-hero page-hero-tight" style={{ marginBottom: "16px" }}>
          <div className="hero-kicker">Administracija</div>
          <h1>Upravljanje korisnicima</h1>
        </section>

        {pageError ? (
          <section className="card" style={{ marginBottom: "24px" }}>
            <p style={{ marginBottom: 0 }}>{pageError}</p>
          </section>
        ) : null}

        {actionMessage ? (
          <section className="card" style={{ marginBottom: "24px" }}>
            <p style={{ marginBottom: 0 }}>{actionMessage}</p>
          </section>
        ) : null}

        <section className="card">
          <div className="section-heading">
            <div>
              <h2 style={{ marginBottom: "8px" }}>Lista korisnika</h2>
            </div>
          </div>

          {isLoading ? (
            <p style={{ marginBottom: 0 }}>Ucavanje korisnika...</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {users.map((listedUser) => (
                <article
                  key={listedUser.id}
                  className="card"
                  style={{ background: "var(--win11-surface-subtle)" }}
                >
                  <h3 style={{ marginBottom: "8px" }}>{listedUser.username}</h3>
                  <p style={{ marginBottom: "6px" }}>
                    <strong>Imejl:</strong> {listedUser.email}
                  </p>
                  <p style={{ marginBottom: "14px" }}>
                    <strong>ID:</strong> {listedUser.id}
                  </p>

                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-2">
                      <span>Rola</span>
                      <select
                        value={accessDrafts[listedUser.id]?.role ?? listedUser.role}
                        onChange={(event) =>
                          handleAccessDraftChange(listedUser.id, "role", event.target.value)
                        }
                      >
                        <option value="USER">{formatRoleLabel("USER")}</option>
                        <option value="MANAGER">{formatRoleLabel("MANAGER")}</option>
                        <option value="ADMIN">{formatRoleLabel("ADMIN")}</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span>Status</span>
                      <select
                        value={accessDrafts[listedUser.id]?.status ?? listedUser.status}
                        onChange={(event) =>
                          handleAccessDraftChange(listedUser.id, "status", event.target.value)
                        }
                      >
                        <option value="ACTIVE">{formatUserStatusLabel("ACTIVE")}</option>
                        <option value="INACTIVE">{formatUserStatusLabel("INACTIVE")}</option>
                        <option value="BLOCKED">{formatUserStatusLabel("BLOCKED")}</option>
                      </select>
                    </label>

                    <button
                      className="btn btn-accent"
                      type="button"
                      onClick={() => void handleAccessSave(listedUser.id)}
                      disabled={listedUser.id === authUser?.id}
                    >
                      {listedUser.id === authUser?.id ? "Ne mozes menjati sebe" : "Sacuvaj pristup"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
