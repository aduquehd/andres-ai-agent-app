"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { marked } from "marked";
import { toast } from "sonner";
import {
  fetchChatHistory,
  sendChatMessage,
  type ChatMessage,
} from "@/lib/api";
import {
  getBrowserId,
  getStoredTheme,
  getUserId,
  resetUserId,
  setStoredTheme,
  type Theme,
} from "@/lib/storage";

const DESKTOP_PANEL_QUERY = "(min-width: 1100px)";

type Prompt = { tag: string; text: string; featured?: boolean };

const PROMPTS: readonly Prompt[] = [
  { tag: "Stack", text: "What's your experience with Python and AI?" },
  {
    tag: "Career",
    text: "What is your full experience details? Include all the information possible, dates, and tech stack.",
    featured: true,
  },
  { tag: "Open Source Projects", text: "What open source projects have you built?" },
  { tag: "Learning", text: "What are you currently learning?" },
];

type ThemeModalMode = "warning" | "success" | null;

function renderMarkdown(content: string): string {
  const html = marked.parse(content, { async: false }) as string;
  // Open all links in new tabs
  return html.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
}

function isRateLimit(msg: string): boolean {
  return msg.includes("Rate limit") || msg.includes("Too many requests");
}

interface MessageProps {
  role: ChatMessage["role"];
  content: string;
  timestamp: string;
}

// Memoized so untouched messages don't re-render (or re-parse markdown)
// every time a new chunk arrives during streaming.
const Message = memo(function Message({ role, content, timestamp }: MessageProps) {
  return (
    <div
      id={`msg-${timestamp}`}
      className={`message ${role === "user" ? "user" : "model"}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
});

export function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [themeModalMode, setThemeModalMode] = useState<ThemeModalMode>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(false);

  const userIdRef = useRef<string>("");
  const browserIdRef = useRef<string>("");
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initRef = useRef(false);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const scrollUpIdleRef = useRef<number | null>(null);
  // Tracks the in-flight chat request so the user can cancel it via the stop
  // button. Cleared in handleSend's finally block.
  const abortControllerRef = useRef<AbortController | null>(null);
  // Synchronous re-entry guard. `isLoading` state lags behind the abort, so
  // any extra click that lands between abort and the finally re-running can
  // start a duplicate request. This ref blocks it without waiting for React
  // to flush state.
  const sendInFlightRef = useRef(false);

  const hasMessages = messages.length > 0;

  // --- theme management
  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (t === "light") {
      root.setAttribute("data-theme", "light");
      if (metaThemeColor) metaThemeColor.setAttribute("content", "#ffffff");
    } else {
      root.removeAttribute("data-theme");
      if (metaThemeColor) metaThemeColor.setAttribute("content", "#0a0a0f");
    }
    setStoredTheme(t);
    setTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    if (theme === "dark") {
      // Switching to light triggers the bug-risk warning modal
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      setThemeModalMode("warning");
      return;
    }
    // Light → dark: flip first, then show the "all clear" confirmation
    applyTheme("dark");
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setThemeModalMode("success");
  }, [theme, applyTheme]);

  const closeThemeModal = useCallback(() => {
    setThemeModalMode(null);
    lastFocusedRef.current?.focus();
    lastFocusedRef.current = null;
  }, []);

  const confirmThemeSwitch = useCallback(() => {
    applyTheme("light");
    closeThemeModal();
  }, [applyTheme, closeThemeModal]);

  // --- about panel
  const isDesktopPanel = useCallback(
    () =>
      typeof window !== "undefined" && window.matchMedia(DESKTOP_PANEL_QUERY).matches,
    [],
  );

  const focusAboutSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    section.classList.add("about-section-highlight");
    window.setTimeout(() => section.classList.remove("about-section-highlight"), 1400);
  }, []);

  const openAboutPanel = useCallback(
    (sectionId?: string) => {
      if (isDesktopPanel()) {
        focusAboutSection(sectionId ?? "about-how-it-works");
        return;
      }
      setAboutOpen(true);
      if (sectionId) {
        window.setTimeout(() => focusAboutSection(sectionId), 280);
      }
    },
    [isDesktopPanel, focusAboutSection],
  );

  const closeAboutPanel = useCallback(() => setAboutOpen(false), []);
  const toggleAboutPanel = useCallback(() => {
    setAboutOpen((open) => !open);
  }, []);

  // --- chat actions
  // rAF-coalesced scroll. Multiple calls within a frame collapse to one DOM
  // write, and we skip the scroll entirely if the user has scrolled up to
  // read history (>200px from bottom) so streaming doesn't fight them.
  const scrollToBottom = useCallback((opts?: { force?: boolean }) => {
    const force = opts?.force ?? false;
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = conversationRef.current;
      if (!el) return;
      if (!force) {
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom > 200) return;
      }
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(
    () => () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    },
    [],
  );

  // Tint the scrollbar magenta while the user is actively scrolling upward,
  // and let the CSS transition fade it back to the default gradient when they
  // stop or scroll down.
  useEffect(() => {
    const el = conversationRef.current;
    if (!el) return;
    lastScrollTopRef.current = el.scrollTop;
    const IDLE_MS = 180;
    const THRESHOLD = 2;
    const onScroll = () => {
      const top = el.scrollTop;
      const delta = top - lastScrollTopRef.current;
      lastScrollTopRef.current = top;
      if (delta < -THRESHOLD) {
        el.classList.add("scrolling-up");
        if (scrollUpIdleRef.current !== null) window.clearTimeout(scrollUpIdleRef.current);
        scrollUpIdleRef.current = window.setTimeout(() => {
          el.classList.remove("scrolling-up");
          scrollUpIdleRef.current = null;
        }, IDLE_MS);
      } else if (delta > THRESHOLD) {
        if (scrollUpIdleRef.current !== null) {
          window.clearTimeout(scrollUpIdleRef.current);
          scrollUpIdleRef.current = null;
        }
        el.classList.remove("scrolling-up");
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (scrollUpIdleRef.current !== null) {
        window.clearTimeout(scrollUpIdleRef.current);
        scrollUpIdleRef.current = null;
      }
    };
  }, []);

  const handleApiError = useCallback((err: unknown) => {
    const message =
      err instanceof Error ? err.message : "An error occurred. Please try again.";
    const suppress = err instanceof Error && isRateLimit(err.message);
    if (!suppress) console.error("Chat error:", err);
    toast.error(message);
  }, []);

  const upsertMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      // Updates during streaming almost always target the most recent message,
      // so scan from the end.
      const idx = prev.findLastIndex((m) => m.timestamp === msg.timestamp);
      if (idx === -1) return [...prev, msg];
      if (prev[idx].content === msg.content && prev[idx].role === msg.role) {
        return prev;
      }
      const next = prev.slice();
      next[idx] = msg;
      return next;
    });
  }, []);

  const handleSend = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || sendInFlightRef.current) return;
      sendInFlightRef.current = true;
      setIsLoading(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      try {
        await sendChatMessage(
          prompt,
          userIdRef.current,
          browserIdRef.current,
          (msg) => {
            upsertMessage(msg);
            scrollToBottom();
          },
          controller.signal,
        );
        setInput("");
      } catch (err) {
        // User-initiated stop: silent, leaves the partial response in place.
        const isAbort =
          (err instanceof DOMException && err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError");
        if (isAbort) return;
        handleApiError(err);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        sendInFlightRef.current = false;
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [upsertMessage, scrollToBottom, handleApiError],
  );

  const handleStop = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    abortControllerRef.current?.abort();
  }, []);

  // Abort any in-flight request if the component unmounts mid-stream.
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleSend(input);
    },
    [handleSend, input],
  );

  const startNewChat = useCallback(() => {
    userIdRef.current = resetUserId();
    setMessages([]);
    inputRef.current?.focus();
  }, []);

  const handlePromptChip = useCallback(
    (prompt: string) => {
      if (isLoading) return;
      setInput(prompt);
      handleSend(prompt);
    },
    [handleSend, isLoading],
  );

  // --- copy email
  const copyEmail = useCallback(() => {
    navigator.clipboard
      .writeText("aduquehd@gmail.com")
      .then(() => {
        setEmailFeedback(true);
        window.setTimeout(() => setEmailFeedback(false), 2000);
      })
      .catch((err) => console.error("Failed to copy email:", err));
  }, []);

  // --- initial mount: theme + ids + load history
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    applyTheme(getStoredTheme());
    userIdRef.current = getUserId();
    browserIdRef.current = getBrowserId();

    fetchChatHistory(userIdRef.current, browserIdRef.current)
      .then((history) => {
        if (history.length > 0) {
          setMessages(history);
          scrollToBottom({ force: true });
        }
      })
      .catch((err) => {
        if (!(err instanceof Error && isRateLimit(err.message))) {
          console.error("Failed to load chat history:", err);
        }
        if (err instanceof Error) toast.error(err.message);
      });
  }, [applyTheme, scrollToBottom]);

  // --- escape closes modals
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (themeModalMode) {
        closeThemeModal();
        return;
      }
      if (aboutOpen) closeAboutPanel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [themeModalMode, aboutOpen, closeThemeModal, closeAboutPanel]);

  // --- render

  return (
    <>
      <div className="app-container">
        <nav className="top-nav">
          <div className="top-nav-content">
            <div className="status-indicator">
              <span className="status-dot"></span>
            </div>
            <button
              id="about-toggle"
              className="portfolio-link tech-details-link"
              type="button"
              aria-controls="about-panel"
              aria-expanded={aboutOpen}
              title="About this assistant"
              onClick={toggleAboutPanel}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              About
            </button>
            <button
              className="theme-toggle"
              id="theme-toggle"
              title="Toggle theme"
              onClick={toggleTheme}
            >
              <svg
                className="sun-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <svg
                className="moon-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </button>
          </div>
        </nav>

        <header className="app-header">
          <div className="header-content">
            <div className="title-section">
              <h1 className="app-title">AndresAI</h1>
              <p className="app-subtitle">AI Assistant by aduquehd</p>
            </div>
            <div className="social-links">
              <div className="email-container">
                <span className="email-text">aduquehd@gmail.com</span>
                <button
                  className="copy-button"
                  onClick={copyEmail}
                  title="Copy email"
                  type="button"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <a
                href="https://linkedin.com/in/aduquehd"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link linkedin"
                aria-label="LinkedIn profile"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://github.com/aduquehd/AndresAI-Agent"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link github"
                aria-label="GitHub repository"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </header>

        <main className="chat-container">
          <div className="chat-messages" id="conversation" ref={conversationRef}>
            {!hasMessages && (
              <section className="empty-state" id="empty-state" aria-hidden="false">
                <div className="empty-state-eyebrow">
                  <span className="empty-state-eyebrow-dot"></span>
                  Personal AI · Live now
                </div>
                <h2 className="empty-state-title">Ask me about Andrés.</h2>
                <p className="empty-state-subtitle">
                  I&apos;m an AI assistant trained on Andrés Duque&apos;s professional
                  journey — 10+ years in backend, microservices, and cloud. I speak in
                  first person, as him.
                </p>
                <div className="empty-state-prompts" role="list">
                  {PROMPTS.map((p) => (
                    <button
                      key={p.text}
                      className={`prompt-chip${p.featured ? " prompt-chip-featured" : ""}`}
                      type="button"
                      role="listitem"
                      onClick={() => handlePromptChip(p.text)}
                    >
                      <span className="prompt-chip-tag">{p.tag}</span>
                      <span className="prompt-chip-text">{p.text}</span>
                    </button>
                  ))}
                </div>
                <button
                  className="empty-state-more"
                  type="button"
                  onClick={() => openAboutPanel("about-how-it-works")}
                >
                  How does this work?
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </section>
            )}
            {messages.map((m) => (
              <Message
                key={m.timestamp}
                role={m.role}
                content={m.content}
                timestamp={m.timestamp}
              />
            ))}
          </div>

          <div
            className={`typing-indicator ${isLoading ? "active" : ""}`}
            id="spinner"
          >
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div
            className={`suggestions-bar ${hasMessages ? "is-visible" : ""}`}
            id="suggestions-bar"
            aria-hidden={!hasMessages}
          >
            <span className="suggestions-bar-label">Try</span>
            <div className="suggestions-bar-scroller">
              {PROMPTS.map((p) => (
                <button
                  key={p.text}
                  className="suggestion-pill"
                  type="button"
                  onClick={() => handlePromptChip(p.text)}
                >
                  {p.tag}
                </button>
              ))}
            </div>
            <button
              className="suggestions-bar-more"
              type="button"
              aria-label="How does this work?"
              onClick={() => openAboutPanel("about-how-it-works")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span className="suggestions-bar-more-text">How does this work?</span>
            </button>
          </div>

          <form method="post" className="input-container" onSubmit={handleSubmit}>
            <div className={`input-wrapper ${isLoading ? "disabled" : ""}`}>
              <input
                id="prompt-input"
                name="prompt"
                className="message-input"
                placeholder="Ask any question about me..."
                autoComplete="off"
                autoFocus
                disabled={isLoading}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                ref={inputRef}
              />
              <button
                className={`send-button${isLoading ? " is-stopping" : ""}`}
                type={isLoading ? "button" : "submit"}
                onClick={isLoading ? handleStop : undefined}
                aria-label={isLoading ? "Stop response" : "Send message"}
                title={isLoading ? "Stop response" : "Send message"}
              >
                {isLoading ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="1.5" />
                  </svg>
                ) : (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                )}
              </button>
            </div>
            <div className={`new-chat-container ${hasMessages ? "show" : ""}`}>
              <button
                id="new-chat-btn"
                className="new-chat-button"
                type="button"
                title="Start New Chat"
                onClick={startNewChat}
                disabled={isLoading}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="7" x2="12" y2="13" />
                  <line x1="9" y1="10" x2="15" y2="10" />
                </svg>
                <span className="new-chat-button-text">Start a new chat</span>
              </button>
            </div>
          </form>
        </main>

        <div
          className={`about-backdrop ${aboutOpen ? "is-open" : ""}`}
          id="about-backdrop"
          aria-hidden={!aboutOpen}
          onClick={closeAboutPanel}
        ></div>
        <aside
          className={`about-panel ${aboutOpen ? "is-open" : ""}`}
          id="about-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="about-panel-title"
          aria-hidden={!aboutOpen}
        >
          <header className="about-panel-header">
            <div>
              <span className="about-panel-eyebrow">// AndresAI</span>
              <h2 className="about-panel-title" id="about-panel-title">
                About this assistant
              </h2>
            </div>
            <button
              className="about-panel-close"
              type="button"
              aria-label="Close panel"
              onClick={closeAboutPanel}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          <div className="about-panel-body">
            <section className="about-section">
              <h3 className="about-section-title">What is this?</h3>
              <p>
                An AI assistant that represents Andrés Duque — Senior Software Engineer
                with 10+ years in backend, microservices, and cloud. Ask anything about
                his career, stack, or projects. I&apos;ll answer in first person, as
                him.
              </p>
            </section>

            <section className="about-section">
              <h3 className="about-section-title">What you can ask</h3>
              <ul className="about-list">
                <li>Career history &amp; specific roles</li>
                <li>Technical expertise &amp; years per stack</li>
                <li>Notable projects &amp; open source work</li>
                <li>Currently learning &amp; what&apos;s next</li>
                <li>Contact &amp; availability</li>
              </ul>
            </section>

            <section className="about-section" id="about-how-it-works">
              <h3 className="about-section-title">How it works</h3>
              <p>
                Each question runs through a RAG (retrieval-augmented generation)
                pipeline: semantic search retrieves relevant slices of Andrés&apos;s
                profile from a vector store, then an AI agent composes a grounded
                answer streamed back over HTTP.
              </p>
              <ul className="about-stack">
                <li>
                  <span>01</span>
                  FastAPI · async Python
                </li>
                <li>
                  <span>02</span>
                  PydanticAI · OpenAI
                </li>
                <li>
                  <span>03</span>
                  PostgreSQL · pgvector
                </li>
                <li>
                  <span>04</span>
                  Redis · rate limiting
                </li>
                <li>
                  <span>05</span>
                  Docker · containerized
                </li>
              </ul>
            </section>

            <section className="about-section">
              <h3 className="about-section-title">Frontend &amp; realtime</h3>
              <p>
                A single Next.js 16 app serves both this chat at <code>/</code>{" "}
                and a separate ops console at <code>/admin</code>. The chat
                consumes streamed responses; the admin opens a long-lived
                WebSocket to render every new conversation as it lands.
              </p>
              <ul className="about-stack">
                <li>
                  <span>01</span>
                  React 19 · TypeScript
                </li>
                <li>
                  <span>02</span>
                  Next.js 16 · App Router · Turbopack
                </li>
                <li>
                  <span>03</span>
                  Tailwind v4 · shadcn/ui · Radix
                </li>
                <li>
                  <span>04</span>
                  Streaming HTTP · marked · sonner
                </li>
                <li>
                  <span>05</span>
                  WebSockets · admin live updates
                </li>
                <li>
                  <span>06</span>
                  Vercel · edge-first deploy
                </li>
              </ul>
            </section>

            <section className="about-section about-section-links">
              <a
                href="https://www.aduquehd.com/projects/ai-agent"
                target="_blank"
                rel="noopener noreferrer"
                className="about-link"
              >
                Read the tech write-up
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17L17 7"></path>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </a>
              <a
                href="https://github.com/aduquehd/AndresAI-Agent"
                target="_blank"
                rel="noopener noreferrer"
                className="about-link"
              >
                Source on GitHub
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17L17 7"></path>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </a>
            </section>
          </div>
        </aside>
      </div>

      {/* Theme switch modal */}
      <div
        className={`theme-modal-backdrop ${themeModalMode ? "is-open" : ""}`}
        id="theme-modal-backdrop"
        aria-hidden={!themeModalMode}
        onClick={closeThemeModal}
      ></div>
      <div
        className={`theme-modal ${themeModalMode ? "is-open" : ""}`}
        id="theme-modal"
        role="dialog"
        aria-modal="true"
        aria-hidden={!themeModalMode}
        data-mode={themeModalMode ?? "warning"}
        aria-labelledby="theme-modal-title"
        aria-describedby="theme-modal-body"
      >
        <div className="theme-modal-glitch" aria-hidden="true"></div>

        <div className="theme-modal-mode theme-modal-mode-warning">
          <div className="theme-modal-icon" aria-hidden="true">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <span className="theme-modal-eyebrow">// SYSTEM ALERT</span>
          <h2 className="theme-modal-title" id="theme-modal-title">
            Bug risk detected
          </h2>
          <p className="theme-modal-body" id="theme-modal-body">
            Activating <strong>light mode</strong> is statistically proven to attract{" "}
            <strong>bugs</strong>. Studies show 99.4% of bugs are drawn to bright
            surfaces — your codebase included.
            <br />
            <br />
            Proceed at your own risk.
          </p>
          <div className="theme-modal-actions">
            <button
              className="theme-modal-btn theme-modal-btn-safe"
              type="button"
              onClick={closeThemeModal}
            >
              Keep the secure dark mode
            </button>
            <button
              className="theme-modal-btn theme-modal-btn-danger"
              type="button"
              onClick={confirmThemeSwitch}
            >
              I assume the risk
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div className="theme-modal-mode theme-modal-mode-success">
          <div className="theme-modal-icon" aria-hidden="true">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
          </div>
          <span className="theme-modal-eyebrow">// SYSTEM SECURE</span>
          <h2 className="theme-modal-title">Bug risk neutralized</h2>
          <p className="theme-modal-body">
            <strong>Dark mode</strong> restored. The codebase is once again hidden from
            light. <strong>0 bugs</strong> detected in the perimeter.
            <br />
            <br />
            Maintain vigilance.
          </p>
          <div className="theme-modal-actions">
            <button
              className="theme-modal-btn theme-modal-btn-clear"
              type="button"
              onClick={closeThemeModal}
            >
              Acknowledged
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {emailFeedback && <div className="copy-feedback">Email Copied!</div>}
    </>
  );
}
