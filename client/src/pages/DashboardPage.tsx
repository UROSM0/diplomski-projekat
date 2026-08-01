import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../api/shared/apiError";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { UserDTO } from "../models/users/UserDTO";
import { formatRoleLabel, formatUserStatusLabel } from "../utils/userDisplay";

type DashboardPageProps = { userAPI: IUserAPI };

export const DashboardPage: React.FC<DashboardPageProps> = ({ userAPI }) => {
  const { token, user: authUser } = useAuth();
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setUser(await userAPI.getCurrentUser(token));
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Ucavanje profila nije uspelo."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [token, userAPI]);

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
    : authUser?.username ?? "Korisnik";

  return (
    <div className="page-shell">
      <DashboardNavbar userAPI={userAPI} activePage="dashboard" />

      <main className="page-main" style={{ maxWidth: "980px" }}>
        <section className="card page-hero page-hero-tight" style={{ marginBottom: "16px" }}>
          <div className="flex justify-between gap-4" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div className="hero-kicker">Nalog</div>
              <h1>{displayName}</h1>
              <p style={{ margin: "8px 0 0" }}>Pregled informacija vezanih za tvoj korisnicki profil.</p>
            </div>
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={displayName}
                style={{ width: "88px", height: "88px", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div className="topbar-avatar" style={{ width: "88px", height: "88px", fontSize: "28px" }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="hero-actions">
            <Link className="btn btn-accent" to="/account/manage">Upravljanje nalogom</Link>
            <Link className="btn btn-standard" to="/transactions">Istorija transakcija</Link>
          </div>
        </section>

        {error ? (
          <section className="card status-banner status-banner-error" style={{ marginBottom: "16px" }}>
            <p style={{ marginBottom: 0 }}>{error}</p>
          </section>
        ) : null}

        <section className="card">
          <div className="section-heading">
            <div>
              <div className="hero-kicker">Profil</div>
              <h2>Licni i sistemski podaci</h2>
            </div>
          </div>

          {isLoading ? (
            <p style={{ marginBottom: 0 }}>Ucavanje profila...</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
              {[
                ["Korisnicko ime", user?.username ?? authUser?.username ?? "-"],
                ["Imejl", user?.email ?? "-"],
                ["Ime", user?.firstName || "-"],
                ["Prezime", user?.lastName || "-"],
                ["Rola", formatRoleLabel(user?.role ?? authUser?.role)],
                ["Status naloga", formatUserStatusLabel(user?.status ?? "-")],
                ["Stanje novcanika", typeof user?.balance === "number" ? `${user.balance.toFixed(2)} RSD` : "0.00 RSD"],
                ["ID korisnika", user?.id ?? authUser?.id ?? "-"],
              ].map(([label, value]) => (
                <div key={label} className="list-item" style={{ cursor: "default", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: "var(--win11-text-tertiary)", fontSize: "12px" }}>{label}</span>
                    <p style={{ margin: "4px 0 0", wordBreak: "break-word" }}><strong>{value}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
