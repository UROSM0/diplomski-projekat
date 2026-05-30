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

  return (
    <div className="page-shell">
      <DashboardNavbar userAPI={userAPI} activePage="marketplace" />

      <main className="page-main" style={{ maxWidth: "1240px" }}>
        <section className="card page-hero page-hero-tight" style={{ marginBottom: "16px" }}>
          <div className="flex justify-between gap-3" style={{ flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ maxWidth: "520px" }}>
              <div className="hero-kicker">Oglasi</div>
              <h1>Prodaja i kupovina</h1>
            </div>

            <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
              <Link className="btn btn-standard" to="/dashboard">
                Nazad na nalog
              </Link>
            </div>
          </div>

          <div className="section-tabs" style={{ marginTop: "14px" }}>
            <NavLink
              to="/marketplace/all"
              className={({ isActive }) =>
                isActive ? "section-tab section-tab-active" : "section-tab"
              }
            >
              Svi oglasi
            </NavLink>
            <NavLink
              to="/marketplace/create"
              className={({ isActive }) =>
                isActive ? "section-tab section-tab-active" : "section-tab"
              }
            >
              Dodaj oglas
            </NavLink>
            <NavLink
              to="/marketplace/favorites"
              className={({ isActive }) =>
                isActive ? "section-tab section-tab-active" : "section-tab"
              }
            >
              Omiljeni oglasi
            </NavLink>
            {isModerator ? (
              <NavLink
                to="/marketplace/moderation"
                className={({ isActive }) =>
                  isActive ? "section-tab section-tab-active" : "section-tab"
                }
              >
                Moderacija
              </NavLink>
            ) : null}
          </div>
        </section>

        <Outlet />
      </main>
    </div>
  );
};
