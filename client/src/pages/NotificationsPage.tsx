import React, { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "../api/shared/apiError";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { NotificationDTO } from "../models/users/NotificationDTO";

type NotificationsPageProps = {
  userAPI: IUserAPI;
};

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ userAPI }) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const loadNotifications = async () => {
      if (!token) {
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPageError("");

      try {
        const loadedNotifications = await userAPI.getNotifications(token, {
          unreadOnly: showUnreadOnly || undefined,
        });
        setNotifications(loadedNotifications);
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje obavestenja nije uspelo."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadNotifications();
  }, [showUnreadOnly, token, userAPI]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const handleMarkAsRead = async (notificationId: string) => {
    if (!token) {
      return;
    }

    try {
      const updatedNotification = await userAPI.markNotificationAsRead(token, notificationId);
      setNotifications((current) => {
        const nextNotifications = current.map((notification) =>
          notification.id === updatedNotification.id ? updatedNotification : notification
        );
        return showUnreadOnly
          ? nextNotifications.filter((notification) => !notification.isRead)
          : nextNotifications;
      });
    } catch (error) {
      setPageError(getErrorMessage(error, "Izmena obavestenja nije uspela."));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token || !notifications.some((notification) => !notification.isRead)) {
      return;
    }

    setIsMarkingAll(true);
    setPageError("");

    try {
      await userAPI.markAllNotificationsAsRead(token);
      setNotifications((current) =>
        showUnreadOnly
          ? []
          : current.map((notification) => ({
              ...notification,
              isRead: true,
            }))
      );
    } catch (error) {
      setPageError(getErrorMessage(error, "Oznacavanje obavestenja nije uspelo."));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getNotificationAccent = (type: string): string => {
    switch (type) {
      case "AD_APPROVED":
        return "#7DFFB3";
      case "AD_REJECTED":
        return "#FF8B8B";
      case "NEW_MESSAGE":
        return "#7EC8FF";
      case "PURCHASE_SUCCESS":
        return "#FFD66B";
      case "NEW_RATING":
        return "#D8A6FF";
      default:
        return "var(--win11-accent)";
    }
  };

  return (
    <div className="page-shell">
      <DashboardNavbar userAPI={userAPI} activePage="notifications" />

      <main className="page-main" style={{ maxWidth: "1080px" }}>
        <section className="card page-hero page-hero-tight" style={{ marginBottom: "24px" }}>
          <div
            className="flex justify-between gap-3"
            style={{ alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}
          >
            <div>
              <h1 style={{ marginBottom: "8px" }}>Obavestenja</h1>
            </div>
            <button
              className="btn btn-accent"
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll || !notifications.some((notification) => !notification.isRead)}
            >
              {isMarkingAll ? "Cuvanje..." : "Oznaci sve kao procitano"}
            </button>
          </div>

          <div className="flex gap-3" style={{ flexWrap: "wrap", alignItems: "center" }}>
            <button
              className={!showUnreadOnly ? "btn btn-accent" : "btn btn-ghost"}
              type="button"
              onClick={() => setShowUnreadOnly(false)}
            >
              Sve
            </button>
            <button
              className={showUnreadOnly ? "btn btn-accent" : "btn btn-ghost"}
              type="button"
              onClick={() => setShowUnreadOnly(true)}
            >
              Neprocitano
            </button>
            <span style={{ fontSize: "13px", color: "var(--win11-text-secondary)" }}>
              Neprocitano: {unreadCount}
            </span>
          </div>

          {pageError ? <p style={{ marginTop: "14px", marginBottom: 0 }}>{pageError}</p> : null}
        </section>

        <section className="card">
          {isLoading ? <p>Ucavanje obavestenja...</p> : null}
          {!isLoading && !notifications.length ? (
            <p style={{ marginBottom: 0 }}>
              {showUnreadOnly ? "Nemate neprocitana obavestenja." : "Jos nemate obavestenja."}
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className="card"
                style={{
                  background: notification.isRead ? "var(--win11-surface-subtle)" : "var(--win11-surface-elevated)",
                  borderLeft: `4px solid ${getNotificationAccent(notification.type)}`,
                }}
              >
                <div
                  className="flex justify-between gap-3"
                  style={{ alignItems: "flex-start", flexWrap: "wrap" }}
                >
                  <div style={{ flex: 1, minWidth: "240px" }}>
                    <div
                      className="flex gap-2"
                      style={{ alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}
                    >
                      <strong>{notification.title}</strong>
                      <span
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: "var(--win11-text-tertiary)",
                        }}
                      >
                        {notification.type.split("_").join(" ")}
                      </span>
                      {!notification.isRead ? (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: getNotificationAccent(notification.type),
                          }}
                        >
                          Novo
                        </span>
                      ) : null}
                    </div>
                    <p style={{ marginBottom: "10px" }}>{notification.content}</p>
                    <p style={{ marginBottom: 0, fontSize: "12px", color: "var(--win11-text-tertiary)" }}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {!notification.isRead ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => void handleMarkAsRead(notification.id)}
                    >
                      Oznaci kao procitano
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
