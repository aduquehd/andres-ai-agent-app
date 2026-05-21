import { API_BASE_URL } from "@/lib/api";

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminUser {
  username: string;
}

export interface UserRow {
  id: number;
  username: string;
  browser_id: string;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: string | null;
}

export interface MessageRow {
  id: number;
  user_id: number;
  message: string;
  direction: "incoming" | "outgoing" | null;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  response_time_ms: number | null;
  created_at: string | null;
}

export interface AgentMessageRow {
  id: number;
  user_id: number;
  message_list: string;
  created_at: string | null;
}

export type KnowledgeBaseType = "hobbies" | "foods";

export interface KnowledgeBaseRow {
  id: number;
  type: KnowledgeBaseType | null;
  title: string;
  content: string;
  created_at: string | null;
}

export interface AgentContextRow {
  id: number;
  status: boolean;
  agent_prompt: string | null;
  created_at: string | null;
}

class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    const detail =
      typeof body === "object" && body && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : response.statusText;
    throw new HttpError(detail || `Request failed (${response.status})`, response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export { HttpError };

// --- Auth

export function login(username: string, password: string): Promise<AdminUser> {
  return adminFetch("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return adminFetch("/api/admin/logout", { method: "POST" });
}

export function me(): Promise<AdminUser> {
  return adminFetch("/api/admin/me");
}

// --- Dashboard

export interface DashboardStats {
  totals: {
    users: number;
    messages: number;
    kb_entries: number;
    agent_contexts: number;
  };
  today: {
    messages: number;
    active_users: number;
    avg_latency_ms: number | null;
  };
  messages_by_day: Array<{ date: string; incoming: number; outgoing: number }>;
  messages_by_country: Array<{ country: string; count: number }>;
  direction_split: { incoming: number; outgoing: number };
  latency: {
    avg: number | null;
    p50: number | null;
    p95: number | null;
    p99: number | null;
  };
  generated_at: string;
}

export function getDashboardStats(): Promise<DashboardStats> {
  return adminFetch("/api/admin/dashboard/stats");
}

// --- Users

export function listUsers(params: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<Paginated<UserRow>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  const qs = search.toString();
  return adminFetch(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

export function getUser(id: number): Promise<UserRow> {
  return adminFetch(`/api/admin/users/${id}`);
}

export function deleteUser(id: number): Promise<{ ok: boolean }> {
  return adminFetch(`/api/admin/users/${id}`, { method: "DELETE" });
}

// --- Messages

export type MessageSort = "created_desc" | "created_asc";

export function listMessages(params: {
  q?: string;
  user_id?: number;
  direction?: "incoming" | "outgoing";
  country?: string;
  sort?: MessageSort;
  limit?: number;
  offset?: number;
}): Promise<Paginated<MessageRow>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.user_id) search.set("user_id", String(params.user_id));
  if (params.direction) search.set("direction", params.direction);
  if (params.country) search.set("country", params.country);
  if (params.sort) search.set("sort", params.sort);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  const qs = search.toString();
  return adminFetch(`/api/admin/messages${qs ? `?${qs}` : ""}`);
}

export function listMessageCountries(): Promise<string[]> {
  return adminFetch("/api/admin/messages/countries");
}

export function getMessage(id: number): Promise<MessageRow> {
  return adminFetch(`/api/admin/messages/${id}`);
}

export function deleteMessage(id: number): Promise<{ ok: boolean }> {
  return adminFetch(`/api/admin/messages/${id}`, { method: "DELETE" });
}

// --- Agent messages

export function listAgentMessages(params: {
  user_id?: number;
  limit?: number;
  offset?: number;
}): Promise<Paginated<AgentMessageRow>> {
  const search = new URLSearchParams();
  if (params.user_id) search.set("user_id", String(params.user_id));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  const qs = search.toString();
  return adminFetch(`/api/admin/agent-messages${qs ? `?${qs}` : ""}`);
}

export function getAgentMessage(id: number): Promise<AgentMessageRow> {
  return adminFetch(`/api/admin/agent-messages/${id}`);
}

export function deleteAgentMessage(id: number): Promise<{ ok: boolean }> {
  return adminFetch(`/api/admin/agent-messages/${id}`, { method: "DELETE" });
}

// --- Knowledge base

export interface KnowledgeBasePayload {
  type: KnowledgeBaseType;
  title: string;
  content: string;
}

export function listKnowledgeBase(params: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<Paginated<KnowledgeBaseRow>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  const qs = search.toString();
  return adminFetch(`/api/admin/knowledge-base${qs ? `?${qs}` : ""}`);
}

export function getKnowledgeBase(id: number): Promise<KnowledgeBaseRow> {
  return adminFetch(`/api/admin/knowledge-base/${id}`);
}

export function createKnowledgeBase(
  payload: KnowledgeBasePayload,
): Promise<KnowledgeBaseRow> {
  return adminFetch(`/api/admin/knowledge-base`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateKnowledgeBase(
  id: number,
  payload: KnowledgeBasePayload,
): Promise<KnowledgeBaseRow> {
  return adminFetch(`/api/admin/knowledge-base/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteKnowledgeBase(id: number): Promise<{ ok: boolean }> {
  return adminFetch(`/api/admin/knowledge-base/${id}`, { method: "DELETE" });
}

// --- Agent contexts

export interface AgentContextPayload {
  status: boolean;
  agent_prompt: string | null;
}

export function listAgentContexts(params: {
  limit?: number;
  offset?: number;
}): Promise<Paginated<AgentContextRow>> {
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  const qs = search.toString();
  return adminFetch(`/api/admin/agent-contexts${qs ? `?${qs}` : ""}`);
}

export function getAgentContext(id: number): Promise<AgentContextRow> {
  return adminFetch(`/api/admin/agent-contexts/${id}`);
}

export function createAgentContext(
  payload: AgentContextPayload,
): Promise<AgentContextRow> {
  return adminFetch(`/api/admin/agent-contexts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAgentContext(
  id: number,
  payload: AgentContextPayload,
): Promise<AgentContextRow> {
  return adminFetch(`/api/admin/agent-contexts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAgentContext(id: number): Promise<{ ok: boolean }> {
  return adminFetch(`/api/admin/agent-contexts/${id}`, { method: "DELETE" });
}
