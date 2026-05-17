import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IUserAPI } from "../../../api/users/IUserAPI";
import { useAuth } from "../../../hooks/useAuthHook";
import { UserDTO } from "../../../models/users/UserDTO";
import { formatRoleLabel, formatUserDisplayName } from "../../../utils/userDisplay";

type DashboardNavbarProps = {
  userAPI: IUserAPI;
  activePage?: "dashboard" | "marketplace" | "chat" | "notifications" | "admin-users" | "audit";
};

export const DashboardNavbar: React.FC<DashboardNavbarProps> = ({
  userAPI,
  activePage = "dashboard",
}) => {
  const { user: authUser, logout, token } = useAuth();
  const isAdmin = authUser?.role?.toUpperCase() === "ADMIN";
  const [user, setUser] = useState<UserDTO | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      if (authUser?.id && token) {
        try {
          const userData = await userAPI.getCurrentUser(token);
          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUser();
  }, [authUser, token, userAPI]);

  useEffect(() => {
    const loadUnreadNotifications = async () => {
      if (!token) {
        setUnreadNotificationsCount(0);
        return;
      }

      try {
        const notifications = await userAPI.getNotifications(token, { unreadOnly: true });
        setUnreadNotificationsCount(notifications.length);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    void loadUnreadNotifications();
    const interval = window.setInterval(() => {
      void loadUnreadNotifications();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [token, userAPI]);

  const handleLogout = () => {
    void logout();
    navigate("/");
  };

  const displayUsername = formatUserDisplayName(user ?? authUser ?? { username: "Korisnik" });
  const displayRole = formatRoleLabel(user?.role ?? authUser?.role);
  const displayEmail = user?.email ?? "Profil nije ucitan";

  return (
    <nav className="app-topbar">
      <div className="topbar-brand">
        <span>Oglasnik</span>
        <strong>Prodaja i kupovina</strong>
      </div>

      <div className="topbar-nav">
        <button
          className={activePage === "dashboard" ? "btn topbar-link topbar-link-active" : "btn topbar-link"}
          onClick={() => navigate("/dashboard")}
        >
          Nalog
        </button>
        <button
          className={activePage === "marketplace" ? "btn topbar-link topbar-link-active" : "btn topbar-link"}
          onClick={() => navigate("/marketplace/all")}
        >
          Oglasi
        </button>
        <button
          className={activePage === "chat" ? "btn topbar-link topbar-link-active" : "btn topbar-link"}
          onClick={() => navigate("/chat")}
        >
          Poruke
        </button>
        <button
          className={activePage === "notifications" ? "btn topbar-link topbar-link-active" : "btn topbar-link"}
          onClick={() => navigate("/notifications")}
        >
          Obavestenja
          {unreadNotificationsCount > 0 ? (
            <span className="topbar-notification-badge">
              {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
            </span>
          ) : null}
        </button>
        {isAdmin ? (
          <button
            className={activePage === "admin-users" ? "btn topbar-link topbar-link-active" : "btn topbar-link"}
            onClick={() => navigate("/admin/users")}
          >
            Korisnici
          </button>
        ) : null}
        {isAdmin ? (
          <button
            className={activePage === "audit" ? "btn topbar-link topbar-link-active" : "btn topbar-link"}
            onClick={() => navigate("/admin/audit")}
          >
            Aktivnosti
          </button>
        ) : null}
      </div>

      <div className="topbar-user">
        {isLoading ? (
          <div className="spinner" style={{ width: "20px", height: "20px", borderWidth: "2px" }}></div>
        ) : authUser ? (
          <>
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={displayUsername}
                className="topbar-avatar"
              />
            ) : (
              <div className="topbar-avatar">
                {displayUsername.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="topbar-user-copy">
              <strong>{displayUsername}</strong>
              <span>{displayEmail}</span>
              <span>{displayRole}</span>
            </div>

            <button className="btn btn-standard" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 2v2H3v8h3v2H2V2h4zm4 3l4 3-4 3V9H6V7h4V5z" />
              </svg>
              Odjava
            </button>
          </>
        ) : null}
      </div>
    </nav>
  );
};
