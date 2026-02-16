import { useCallback, useEffect, useRef, useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { useMnflixAuth } from "@/stores/mnflixAuth";
import { conf } from "@/setup/config";

import { DetailView } from "./DetailView";
import { ListView } from "./ListView";
import { SettingsView } from "./SettingsView";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { FancyModal } from "../../Modal";
import { ModalView, NotificationItem, NotificationModalProps } from "../types";
import {
  formatDate,
  getCategoryColor,
  getCategoryLabel,
} from "../utils";

export function NotificationModal({ id }: NotificationModalProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(
    new Set(),
  );
  const [currentView, setCurrentView] = useState<ModalView>("list");
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const token = useMnflixAuth((s) => s.token);
  const API_BASE = import.meta.env.VITE_API_URL || conf().BACKEND_URL;
  const containerRef = useRef<HTMLDivElement>(null);

  // Settings state
  const [autoReadDays, setAutoReadDays] = useState<number>(14);
  const [customFeeds, setCustomFeeds] = useState<string[]>([]);

  // Load read notifications and settings from localStorage
  useEffect(() => {
    const savedRead = localStorage.getItem("read-notifications");
    if (savedRead) {
      try {
        const readArray = JSON.parse(savedRead);
        setReadNotifications(new Set(readArray));
      } catch (e) {
        console.error("Failed to parse read notifications:", e);
      }
    }

    const savedCustomFeeds = localStorage.getItem("notification-custom-feeds");
    if (savedCustomFeeds) {
      try {
        setCustomFeeds(JSON.parse(savedCustomFeeds));
      } catch (e) {
        console.error("Failed to parse custom feeds:", e);
      }
    }
  }, []);

  // Handle shift key for mark all as unread button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftHeld(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        setNotifications([]);
        setReadNotifications(new Set());
        return;
      }

      const res = await fetch(`${API_BASE}/api/reports/my`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Failed to load reports (${res.status})`);
      }

      const reports = await res.json();

      // Convert reports -> NotificationItem (UI stays same)
      const items: NotificationItem[] = (Array.isArray(reports) ? reports : [])
        .filter((r) => r?.adminReply && String(r.adminReply).trim() !== "")
        .map((r) => {
          const movieTitle = r.movie?.title || "Support";
          const status = r.status || "seen";

          return {
            guid: String(r._id),
            title: `MNFLIX: ${movieTitle}`,
            link: "", // optional: you can link to movie page later
            description: String(r.adminReply || ""),
            pubDate: r.repliedAt || r.updatedAt || r.createdAt || new Date().toISOString(),
            category: status, // "new" | "seen" | "fixed" | "unfixable"
            source: "MNFLIX Support",
          };
        });

      setNotifications(items);

      // Build read set from backend: if userSeenReply=true -> read
      const readSet = new Set<string>();
      (Array.isArray(reports) ? reports : []).forEach((r) => {
        if (r?.adminReply && r.userSeenReply === true) {
          readSet.add(String(r._id));
        }
      });
      setReadNotifications(readSet);

      // OPTIONAL: still save to localStorage so your UI doesn't break
      localStorage.setItem("read-notifications", JSON.stringify(Array.from(readSet)));
    } catch (err) {
      console.error("Reports fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, token]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(API_BASE);
    socket.connect();

    // send jwt so backend can join room(userId)
    socket.emit("auth", { token });

    const onReplied = (payload: any) => {
      const guid = String(payload.reportId);

      const newItem: NotificationItem = {
        guid,
        title: `MNFLIX: ${payload.movieTitle || "Support"}`,
        link: "",
        description: String(payload.reply || ""),
        pubDate: payload.repliedAt || new Date().toISOString(),
        category: "seen",
        source: "MNFLIX Support",
      };

      // add to top (don’t duplicate)
      setNotifications((prev) => {
        if (prev.some((n) => n.guid === guid)) return prev;
        return [newItem, ...prev];
      });

      // mark as UNREAD
      setReadNotifications((prev) => {
        const next = new Set(prev);
        next.delete(guid);
        return next;
      });
    };

    socket.on("report-replied", onReplied);

    return () => {
      socket.off("report-replied", onReplied);
      // Optional: disconnect when modal unmounts
      // disconnectSocket();
    };
  }, [API_BASE, token]);

  // Refresh function
  const handleRefresh = () => {
    fetchNotifications();
  };

  const markAsRead = async (guid: string) => {
    // UI immediately
    setReadNotifications((prev) => new Set(prev).add(guid));

    // backend
    try {
      if (!token) return;
      await fetch(`${API_BASE}/api/reports/${guid}/seen-reply`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
    } catch {}
  };

  // Mark all as read
  const markAllAsRead = () => {
    const allGuids = notifications.map((n) => n.guid);
    const newReadSet = new Set(allGuids);
    setReadNotifications(newReadSet);
    localStorage.setItem(
      "read-notifications",
      JSON.stringify(Array.from(newReadSet)),
    );
  };

  // Mark all as unread
  const markAllAsUnread = () => {
    setReadNotifications(new Set());
    localStorage.setItem("read-notifications", JSON.stringify([]));
  };

  const openNotificationDetail = async (notification: NotificationItem) => {
    setSelectedNotification(notification);
    setCurrentView("detail");
    await markAsRead(notification.guid); // ✅ only once
  };

  // Navigate back to list
  const goBackToList = () => {
    setCurrentView("list");
    setSelectedNotification(null);
  };

  // Settings functions
  const openSettings = () => {
    setCurrentView("settings");
  };

  const closeSettings = () => {
    setCurrentView("list");
  };

  // Save settings functions
  const saveAutoReadDays = (days: number) => {
    setAutoReadDays(days);
    localStorage.setItem("notification-auto-read-days", days.toString());
  };

  const saveCustomFeeds = (feeds: string[]) => {
    setCustomFeeds(feeds);
    localStorage.setItem("notification-custom-feeds", JSON.stringify(feeds));
  };

  // Scroll to last read notification
  useEffect(() => {
    if (
      notifications.length > 0 &&
      containerRef.current &&
      currentView === "list"
    ) {
      const lastReadIndex = notifications.findIndex(
        (n) => !readNotifications.has(n.guid),
      );
      if (lastReadIndex > 0) {
        const element = containerRef.current.children[
          lastReadIndex
        ] as HTMLElement;
        if (element) {
          // Use scrollTop instead of scrollIntoView to avoid scrolling the modal container
          const container = containerRef.current;
          const elementTop = element.offsetTop;
          const containerHeight = container.clientHeight;
          const elementHeight = element.clientHeight;

          // Calculate the scroll position to center the element
          const scrollTop =
            elementTop - containerHeight / 2 + elementHeight / 2;

          container.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: "smooth",
          });
        }
      }
    }
  }, [notifications, readNotifications, currentView]);

  const unreadCount = notifications.filter(
    (n) => !readNotifications.has(n.guid),
  ).length;

  // Don't render if there's a critical error
  if (error && !loading) {
    return (
      <FancyModal id={id} title="Notifications" size="lg">
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Icon icon={Icons.WARNING} className="text-[2rem] text-red-400" />
          <p className="text-red-400 mb-2">Failed to load notifications</p>
          <p className="text-sm text-type-secondary">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-4 text-sm text-type-link hover:text-type-linkHover transition-colors"
          >
            Try again
          </button>
        </div>
      </FancyModal>
    );
  }

  return (
    <FancyModal
      id={id}
      title={
        currentView === "list"
          ? "Notifications"
          : currentView === "detail" && selectedNotification
            ? selectedNotification.title
            : currentView === "settings"
              ? "Settings"
              : "Notifications"
      }
      size="lg"
    >
      {currentView === "list" ? (
        <ListView
          notifications={notifications}
          readNotifications={readNotifications}
          unreadCount={unreadCount}
          loading={loading}
          error={error}
          containerRef={containerRef}
          markAllAsRead={markAllAsRead}
          markAllAsUnread={markAllAsUnread}
          isShiftHeld={isShiftHeld}
          onRefresh={handleRefresh}
          onOpenSettings={openSettings}
          openNotificationDetail={openNotificationDetail}
          getCategoryColor={getCategoryColor}
          getCategoryLabel={getCategoryLabel}
          formatDate={formatDate}
        />
      ) : currentView === "detail" && selectedNotification ? (
        <DetailView
          selectedNotification={selectedNotification}
          goBackToList={goBackToList}
          getCategoryColor={getCategoryColor}
          getCategoryLabel={getCategoryLabel}
          formatDate={formatDate}
          isRead={readNotifications.has(selectedNotification.guid)}
          toggleReadStatus={() => {
            if (readNotifications.has(selectedNotification.guid)) {
              // Mark as unread
              const newReadSet = new Set(readNotifications);
              newReadSet.delete(selectedNotification.guid);
              setReadNotifications(newReadSet);
              localStorage.setItem(
                "read-notifications",
                JSON.stringify(Array.from(newReadSet)),
              );
            } else {
              // Mark as read
              markAsRead(selectedNotification.guid);
            }
          }}
        />
      ) : currentView === "settings" ? (
        <SettingsView
          autoReadDays={autoReadDays}
          setAutoReadDays={saveAutoReadDays}
          customFeeds={customFeeds}
          setCustomFeeds={saveCustomFeeds}
          markAllAsUnread={markAllAsUnread}
          onClose={closeSettings}
        />
      ) : null}
    </FancyModal>
  );
}
