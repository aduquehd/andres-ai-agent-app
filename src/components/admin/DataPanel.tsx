"use client";

import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  width?: string;
  align?: "left" | "right";
}

interface DataPanelProps<T> {
  title: string;
  description?: string;
  columns: Column<T>[];
  fetcher: (params: {
    q?: string;
    limit: number;
    offset: number;
  }) => Promise<{ items: T[]; total: number }>;
  rowKey: (row: T) => string | number;
  searchPlaceholder?: string;
  searchable?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  toolbarActions?: ReactNode;
  /** Optional filter row rendered above the search toolbar (e.g. dropdowns, pills). */
  filters?: ReactNode;
  onRowClick?: (row: T) => void;
  refreshKey?: number;
}

export function DataPanel<T>({
  title,
  description,
  columns,
  fetcher,
  rowKey,
  searchPlaceholder = "Search...",
  searchable = true,
  pageSize = 50,
  emptyMessage = "No records found.",
  toolbarActions,
  filters,
  onRowClick,
  refreshKey = 0,
}: DataPanelProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const hasItemsRef = useRef(false);
  hasItemsRef.current = items.length > 0;

  // Filter/sort changes bump refreshKey from the parent. Reset offset to 0 so
  // the user doesn't end up on a now-invalid page. The next effect picks up
  // the change and refetches at offset 0.
  const lastRefreshRef = useRef(refreshKey);
  if (refreshKey !== lastRefreshRef.current) {
    lastRefreshRef.current = refreshKey;
    if (offset !== 0) {
      setOffset(0);
    }
  }

  useEffect(() => {
    let cancelled = false;
    // Skip the spinner on background refreshes (we already have data on screen).
    // First load and explicit pagination/search still show the loader.
    if (!hasItemsRef.current) setLoading(true);
    fetcher({ q: query || undefined, limit: pageSize, offset })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, query, offset, pageSize, refreshKey]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setQuery(searchTerm.trim());
  }

  function clearSearch() {
    setSearchTerm("");
    setQuery("");
    setOffset(0);
  }

  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + pageSize, total);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="admin-eyebrow">{title} · Stream</div>
        {description ? (
          <p className="text-sm text-[color:var(--admin-text-dim)] max-w-2xl pt-2">
            {description}
          </p>
        ) : null}
      </div>

      {filters ? <div className="flex flex-wrap items-center gap-3">{filters}</div> : null}

      <div className="admin-toolbar">
        {searchable ? (
          <form onSubmit={applySearch} className="admin-search">
            <span className="admin-search-prefix">// query</span>
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--admin-text-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="admin-input pl-9 pr-9"
                style={{ borderRadius: 0, borderRight: 0 }}
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-[color:var(--admin-text-muted)] hover:text-[color:var(--admin-text)]"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <button type="submit" className="admin-btn">
              Search
            </button>
          </form>
        ) : (
          <div />
        )}
        {toolbarActions ? <div className="flex gap-2">{toolbarActions}</div> : null}
      </div>

      <div className="admin-panel">
        <div className="overflow-auto">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={{
                      width: c.width,
                      textAlign: c.align ?? "left",
                    }}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[color:var(--admin-accent)]" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-12 text-sm text-[color:var(--admin-text-dim)]"
                  >
                    <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
                      <span>&gt;</span>
                      {emptyMessage}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className={onRowClick ? "cursor-pointer" : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        style={{ textAlign: c.align ?? "left" }}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="admin-meta">
          {total === 0 ? (
            "0 records"
          ) : (
            <>
              <strong>{start}</strong>–<strong>{end}</strong> of{" "}
              <strong>{total}</strong> records
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="admin-btn admin-btn-icon"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-icon"
            disabled={offset + pageSize >= total || loading}
            onClick={() => setOffset(offset + pageSize)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
