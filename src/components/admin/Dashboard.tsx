"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Brain,
  Bot as BotIcon,
  Gauge,
  MessageSquare,
  Users as UsersIcon,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { getDashboardStats, type DashboardStats } from "@/lib/admin-api";

const ACCENT = "#00ffd1";
const VIOLET = "#c4b5fd";
const VIOLET_DEEP = "#7c3aed";
const TEXT_DIM = "#8a8fa3";
const PANEL_LINE = "rgba(255, 255, 255, 0.06)";

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboardStats()
      .then((s) => {
        if (!cancelled) {
          setStats(s);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load stats";
        setError(message);
        toast.error(message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="admin-eyebrow">Control Panel</div>
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="text-sm text-[color:var(--admin-text-dim)] max-w-2xl pt-3">
          Live snapshot of usage, throughput, and the knowledge base powering the agent.
        </p>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error || !stats ? (
        <div className="admin-panel p-6 text-sm text-[color:var(--admin-text-dim)]">
          {error ?? "No data available."}
        </div>
      ) : (
        <DashboardContent stats={stats} />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-panel h-32 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="admin-panel h-72 lg:col-span-2 animate-pulse" />
        <div className="admin-panel h-72 animate-pulse" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="admin-panel h-64 animate-pulse" />
        <div className="admin-panel h-64 animate-pulse" />
      </div>
    </div>
  );
}

function DashboardContent({ stats }: { stats: DashboardStats }) {
  const directionData = [
    { name: "Outgoing", value: stats.direction_split.outgoing, color: ACCENT },
    { name: "Incoming", value: stats.direction_split.incoming, color: VIOLET_DEEP },
  ];

  return (
    <>
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={UsersIcon}
          label="Users"
          value={stats.totals.users.toLocaleString()}
          tag="01 · total"
        />
        <KpiCard
          icon={MessageSquare}
          label="Messages"
          value={stats.totals.messages.toLocaleString()}
          tag="02 · total"
        />
        <KpiCard
          icon={Brain}
          label="KB Entries"
          value={stats.totals.kb_entries.toLocaleString()}
          tag="03 · vector"
        />
        <KpiCard
          icon={Gauge}
          label="Avg Latency"
          value={
            stats.latency.avg !== null
              ? `${Math.round(stats.latency.avg)}ms`
              : "—"
          }
          tag="04 · response"
        />
      </div>

      {/* Today + Latency strip */}
      <div className="grid gap-4 lg:grid-cols-3">
        <TodayPanel stats={stats} />
        <LatencyPanel stats={stats} />
      </div>

      {/* Messages over time */}
      <Panel
        eyebrow="Throughput · Last 30 Days"
        title="Messages per day"
        right={
          <div className="flex items-center gap-3 admin-mono text-[0.66rem] uppercase tracking-widest text-[color:var(--admin-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: ACCENT }}
              />
              Out
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: VIOLET_DEEP }}
              />
              In
            </span>
          </div>
        }
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={stats.messages_by_day}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad-out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={VIOLET_DEEP} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={VIOLET_DEEP} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={PANEL_LINE} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                }
                tick={{ fill: TEXT_DIM, fontSize: 11, fontFamily: "JetBrains Mono" }}
                stroke="transparent"
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis
                tick={{ fill: TEXT_DIM, fontSize: 11, fontFamily: "JetBrains Mono" }}
                stroke="transparent"
                width={40}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="outgoing"
                stroke={ACCENT}
                strokeWidth={1.5}
                fill="url(#grad-out)"
              />
              <Area
                type="monotone"
                dataKey="incoming"
                stroke={VIOLET_DEEP}
                strokeWidth={1.5}
                fill="url(#grad-in)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Direction split + top countries */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          eyebrow="Composition"
          title="Direction split"
          right={
            <span className="admin-mono text-xs text-[color:var(--admin-text-dim)]">
              {(stats.direction_split.incoming + stats.direction_split.outgoing).toLocaleString()}{" "}
              total
            </span>
          }
        >
          {stats.direction_split.incoming + stats.direction_split.outgoing === 0 ? (
            <EmptyState>No messages yet.</EmptyState>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={directionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {directionData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      fontFamily: "Orbitron",
                      fontSize: 11,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: TEXT_DIM,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          eyebrow="Geography"
          title="Top countries"
          right={
            <span className="admin-mono text-xs text-[color:var(--admin-text-dim)]">
              by messages
            </span>
          }
        >
          {stats.messages_by_country.length === 0 ? (
            <EmptyState>No geographic data yet.</EmptyState>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.messages_by_country}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke={PANEL_LINE} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{
                      fill: TEXT_DIM,
                      fontSize: 11,
                      fontFamily: "JetBrains Mono",
                    }}
                    stroke="transparent"
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="country"
                    tick={{
                      fill: TEXT_DIM,
                      fontSize: 11,
                      fontFamily: "JetBrains Mono",
                    }}
                    stroke="transparent"
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,255,209,0.05)" }} />
                  <Bar
                    dataKey="count"
                    fill={ACCENT}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between admin-mono text-[0.66rem] uppercase tracking-widest text-[color:var(--admin-text-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="admin-status-dot" />
          live data
        </span>
        <span>
          {stats.totals.agent_contexts} agent_ctx entries · generated{" "}
          {new Date(stats.generated_at).toLocaleTimeString()}
        </span>
      </div>
    </>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tag,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: string;
  tag: string;
}) {
  return (
    <div className="admin-overview-card">
      <div className="flex items-start justify-between mb-3">
        <div className="admin-overview-card-icon">
          <Icon className="h-4 w-4" />
        </div>
        <span className="admin-mono text-[0.62rem] uppercase tracking-widest text-[color:var(--admin-text-muted)]">
          {tag}
        </span>
      </div>
      <div className="admin-mono text-[2rem] leading-none font-semibold text-[color:var(--admin-text)]">
        {value}
      </div>
      <div className="mt-2 text-[0.72rem] tracking-[0.18em] uppercase font-[Orbitron] text-[color:var(--admin-text-dim)]">
        {label}
      </div>
    </div>
  );
}

function TodayPanel({ stats }: { stats: DashboardStats }) {
  const items = [
    {
      label: "Messages",
      value: stats.today.messages.toLocaleString(),
      icon: MessageSquare,
    },
    {
      label: "Active Users",
      value: stats.today.active_users.toLocaleString(),
      icon: Activity,
    },
    {
      label: "Avg Latency",
      value:
        stats.today.avg_latency_ms !== null
          ? `${Math.round(stats.today.avg_latency_ms)}ms`
          : "—",
      icon: Zap,
    },
  ];
  return (
    <div className="admin-panel admin-scan p-5 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="admin-eyebrow">Today · Live</div>
        <span className="admin-status-dot" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.label}
              className="rounded-md border border-[color:var(--admin-border)] bg-black/20 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-3.5 w-3.5 text-[color:var(--admin-accent)]" />
                <span className="admin-mono text-[0.6rem] uppercase tracking-widest text-[color:var(--admin-text-muted)]">
                  24h
                </span>
              </div>
              <div className="admin-mono text-xl font-semibold">{it.value}</div>
              <div className="mt-1 text-[0.62rem] tracking-[0.16em] uppercase font-[Orbitron] text-[color:var(--admin-text-dim)]">
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LatencyPanel({ stats }: { stats: DashboardStats }) {
  const rows = [
    { label: "p50", value: stats.latency.p50 },
    { label: "p95", value: stats.latency.p95 },
    { label: "p99", value: stats.latency.p99 },
  ];
  const maxValue = Math.max(
    1,
    ...rows.map((r) => r.value ?? 0),
  );
  return (
    <div className="admin-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="admin-eyebrow">Response Time</div>
        <BotIcon className="h-3.5 w-3.5 text-[color:var(--admin-text-muted)]" />
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between admin-mono text-xs mb-1">
              <span className="text-[color:var(--admin-text-dim)] uppercase tracking-widest">
                {r.label}
              </span>
              <span className="text-[color:var(--admin-text)]">
                {r.value !== null ? `${Math.round(r.value)}ms` : "—"}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-[color:var(--admin-border)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: r.value !== null ? `${(r.value / maxValue) * 100}%` : "0%",
                  background: `linear-gradient(90deg, ${ACCENT}, ${VIOLET})`,
                  boxShadow: "0 0 8px rgba(0, 255, 209, 0.4)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  right,
  children,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="admin-eyebrow">{eyebrow}</div>
          <h2 className="admin-mono text-base mt-1 text-[color:var(--admin-text)]">
            {title}
          </h2>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-[color:var(--admin-border-strong)] bg-black/85 px-3 py-2 admin-mono text-xs backdrop-blur">
      {label ? (
        <div className="text-[color:var(--admin-text-dim)] mb-1">
          {(() => {
            const d = new Date(label);
            return Number.isNaN(d.getTime())
              ? label
              : d.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
          })()}
        </div>
      ) : null}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-[color:var(--admin-text-dim)] uppercase tracking-widest text-[0.62rem]">
            {p.name}
          </span>
          <span className="text-[color:var(--admin-text)] ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-[color:var(--admin-text-dim)]">
      <span className="inline-flex items-center gap-2 admin-mono text-xs uppercase tracking-widest">
        <span>&gt;</span>
        {children}
      </span>
    </div>
  );
}
