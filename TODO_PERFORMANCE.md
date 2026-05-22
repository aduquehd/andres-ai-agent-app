# Performance TODOs

Deferred performance work for the chat UI. Pulled out of the perf audit that
shipped fixes A–D (stream-loop offset, memoized `<Message>`, rAF-coalesced
scroll, `findLastIndex` upsert).

## E. Virtualize the chat message list

**Where:** `src/components/chat/ChatApp.tsx` — the `.chat-messages` container
currently maps every message in `messages[]` to a real `<Message>` DOM node.

**What:** Render only the messages inside (or near) the viewport — typically
10–20 — and replace the rest with two empty spacer divs whose heights sum to
the off-screen content. Recommended tool: **TanStack Virtual**
(`@tanstack/react-virtual`), with `useVirtualizer({ count, estimateSize,
getScrollElement: () => conversationRef.current })` and `measureElement` for
content-driven row heights.

**Why it would help:**

- DOM size is the dominant cost for long sessions. Even with memoized
  `<Message>`, the browser still lays out and styles every node on each
  reflow. Virtualization caps mounted nodes at ~20 regardless of
  conversation length.
- Memory: markdown-rendered HTML for long technical answers is sizeable.
  Off-screen messages can be torn down entirely.
- First paint after `fetchChatHistory`: a long history currently parses
  markdown for every prior message on mount. Virtualization defers most of
  that to scroll-in.
- Scroll smoothness during streaming: fewer nodes → cheaper compositor work.

**Why it wasn't in the first batch:**

- Variable row heights are real work. Chat bubbles range from one-liners to
  long markdown with code blocks; row heights are content-driven and need a
  measurement strategy (`measureElement` + a ResizeObserver) to avoid jank.
- Streaming interaction is tricky. The currently-growing assistant message
  changes height every chunk. The virtualizer has to re-measure it
  smoothly, and the auto-scroll path has to call
  `virtualizer.scrollToIndex(lastIndex)` instead of writing `scrollTop`
  directly.
- The payoff scales with conversation length. For a 10–20-turn portfolio
  chat, fixes B + C already eliminate the symptoms. Virtualization shines
  past ~100 messages.

**When to pull the trigger:**

- A single visitor commonly racks up 100+ turns in one session, or
- Scroll feels sluggish after A–D shipped (rare), or
- History loads visibly stutter on mount.

Otherwise this is pre-optimization for a chat that probably averages
5–20 turns per session.

## Other deferred items

- **`fetchChatHistory` does the same O(N²) re-parse on the buffer.** It
  reads the whole response as a single string and then `parseMessages`
  splits + JSON-parses every line. For long histories, the parse cost is
  fine (one pass over the full text) — but the resulting
  `setMessages(history)` triggers a single render that mounts every
  `<Message>` at once. Same root cause as E; same fix.
- **Move markdown parsing out of render.** `renderMarkdown(content)` runs
  during the JSX render phase via `dangerouslySetInnerHTML`. With B, it
  only runs when a message's content actually changes — but it still runs
  on the main thread mid-stream. Could `useMemo` the parsed HTML keyed on
  `(content)` inside `<Message>` if profiling shows this matters, or move
  it to a web worker for very long messages.
- **`fetchChatHistory` rate-limit toast.** Today, a rate-limit on history
  load shows a toast and the chat opens empty. Fine for now; revisit if
  this becomes a user-visible issue.
