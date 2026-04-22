import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { IUserAPI } from "../../api/users/IUserAPI";
import { DashboardNavbar } from "../../components/dashboard/navbar/Navbar";
import { useAuth } from "../../hooks/useAuthHook";

type MarketplaceLayoutProps = {
  userAPI: IUserAPI;
};

export const MarketplaceLayout: React.FC<MarketplaceLayoutProps> = ({ userAPI }) => {
  const { user } = useAuth();
  const isModerator = ["ADMIN", "MANAGER"].includes(user?.role?.toUpperCase() ?? "");

  const getNavStyles = ({ isActive }: { isActive: boolean }) => ({
    padding: "10px 16px",
    borderRadius: "999px",
    border: "1px solid var(--win11-divider)",
    background: isActive ? "var(--win11-accent)" : "rgba(255,255,255,0.04)",
    color: isActive ? "#000" : "var(--win11-text-primary)",
    fontWeight: 600,
    fontSize: "14px",
    textDecoration: "none",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(96,205,255,0.14), transparent 24%), radial-gradient(circle at bottom right, rgba(255,255,255,0.08), transparent 18%), linear-gradient(180deg, #161616 0%, #0f0f0f 100%)",
      }}
    >
      <DashboardNavbar userAPI={userAPI} activePage="marketplace" />

      <main
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "32px 20px 56px",
        }}
      >
        <section
          className="card"
          style={{
            marginBottom: "24px",
            background:
              "linear-gradient(135deg, rgba(96,205,255,0.16) 0%, rgba(37,37,37,0.82) 46%, rgba(20,20,20,0.92) 100%)",
          }}
        >
          <div className="flex justify-between gap-4" style={{ flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ maxWidth: "720px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--win11-divider)",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "var(--win11-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Marketplace
              </div>
              <h1 style={{ marginBottom: "12px" }}>Marketplace Workspace</h1>
              <p style={{ fontSize: "15px", maxWidth: "60ch", marginBottom: 0 }}>
                Marketplace je sada podeljen na jasne podstranice, tako da pregled
                oglasa, dodavanje novih, moderacija i omiljeni oglasi imaju odvojene tokove.
              </p>
            </div>

            <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
              <Link className="btn btn-standard" to="/dashboard">
                Back To Dashboard
              </Link>
            </div>
          </div>

          <div
            className="flex gap-3"
            style={{
              marginTop: "24px",
              flexWrap: "wrap",
            }}
          >
            <NavLink to="/marketplace/all" style={getNavStyles}>
              Svi oglasi
            </NavLink>
            <NavLink to="/marketplace/create" style={getNavStyles}>
              Dodaj oglas
            </NavLink>
            <NavLink to="/marketplace/favorites" style={getNavStyles}>
              Omiljeni oglasi
            </NavLink>
            {isModerator ? (
              <NavLink to="/marketplace/moderation" style={getNavStyles}>
                Moderation
              </NavLink>
            ) : null}
          </div>
        </section>

        <Outlet />
      </main>
    </div>
  );
};
