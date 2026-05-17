import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IUserAPI } from "../../../api/users/IUserAPI";
import { useAuth } from "../../../hooks/useAuthHook";
import { UserDTO } from "../../../models/users/UserDTO";

type DashboardNavbarProps = {
  userAPI: IUserAPI;
  activePage?: "dashboard" | "marketplace" | "chat" | "notifications";
};

export const DashboardNavbar: React.FC<DashboardNavbarProps> = ({
  userAPI,
  activePage = "dashboard",
}) => {
  const { user: authUser, logout, token } = useAuth();
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

  const displayUsername = user?.username ?? authUser?.username ?? "Authenticated user";
  const displayRole = user?.role ?? authUser?.role ?? "Unknown role";
  const displayEmail = user?.email ?? "Profile not loaded yet";

  return (
    <nav className="titlebar" style={{ height: "60px", borderRadius: 0 }}>
      <div className="flex items-center gap-2">
        <button
          className={activePage === "dashboard" ? "btn btn-accent" : "btn btn-ghost"}
          onClick={() => navigate("/dashboard")}
          style={{ padding: "8px 14px" }}
        >
          Dashboard
        </button>
        <button
          className={activePage === "marketplace" ? "btn btn-accent" : "btn btn-ghost"}
          onClick={() => navigate("/marketplace/all")}
          style={{ padding: "8px 14px" }}
        >
          Marketplace
        </button>
        <button
          className={activePage === "chat" ? "btn btn-accent" : "btn btn-ghost"}
          onClick={() => navigate("/chat")}
          style={{ padding: "8px 14px" }}
        >
          Chat
        </button>
        <button
          className={activePage === "notifications" ? "btn btn-accent" : "btn btn-ghost"}
          onClick={() => navigate("/notifications")}
          style={{ padding: "8px 14px", position: "relative" }}
        >
          Notifications
          {unreadNotificationsCount > 0 ? (
            <span
              style={{
                marginLeft: "8px",
                minWidth: "22px",
                height: "22px",
                borderRadius: "999px",
                background: activePage === "notifications" ? "rgba(0, 0, 0, 0.18)" : "var(--win11-accent)",
                color: "#000",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                padding: "0 6px",
              }}
            >
              {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
            </span>
          ) : null}
        </button>
      </div>

      <div className="flex items-center gap-3" style={{ marginLeft: "auto" }}>
        {isLoading ? (
          <div className="spinner" style={{ width: "20px", height: "20px", borderWidth: "2px" }}></div>
        ) : authUser ? (
          <>
            {/* Profile Image */}
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={displayUsername}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid var(--win11-divider)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "var(--win11-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "#000",
                }}
              >
                {displayUsername.charAt(0).toUpperCase()}
              </div>
            )}

            {/* User Info */}
            <div className="flex flex-col" style={{ gap: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--win11-text-primary)" }}>
                {displayEmail}
              </span>
              <span style={{ fontSize: "11px", color: "var(--win11-text-tertiary)" }}>
                {displayRole}
              </span>
            </div>

            {/* Logout Button */}
            <button className="btn btn-ghost" onClick={handleLogout} style={{ padding: "8px 16px" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 2v2H3v8h3v2H2V2h4zm4 3l4 3-4 3V9H6V7h4V5z" />
              </svg>
              Logout
            </button>
          </>
        ) : null}
      </div>
    </nav>
  );
};
