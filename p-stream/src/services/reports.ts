import { conf } from "@/setup/config";

export type ReportItem = {
  _id: string;
  status: "new" | "seen" | "fixed" | "unfixable";
  message: string;
  adminReply?: string;
  userSeenReply?: boolean;
  repliedAt?: string;
  createdAt: string;
  movie?: { title?: string; tmdbId?: number };
};

export async function fetchMyReports(token: string): Promise<ReportItem[]> {
  const base = import.meta.env.VITE_API_URL || conf().BACKEND_URL;

  const res = await fetch(`${base}/api/reports/my`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to load reports");
  return res.json();
}

export async function markReplySeen(token: string, reportId: string) {
  const base = import.meta.env.VITE_API_URL || conf().BACKEND_URL;

  const res = await fetch(`${base}/api/reports/${reportId}/seen-reply`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to mark seen");
  return res.json();
}
