export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant" | "model";
  content: string;
  timestamp: string;
}

export interface RateLimitError {
  error: string;
  message: string;
  retry_after: number;
}

function chatAuthHeaders(userId: string, browserId: string): HeadersInit {
  return {
    Authorization: `User-Id ${userId}`,
    "X-Browser-Id": browserId,
  };
}

async function handleApiError(response: Response): Promise<never> {
  const errorText = await response.text();

  if (response.status === 429) {
    try {
      const rateLimit: RateLimitError = JSON.parse(errorText);
      const retryAfter = rateLimit.retry_after || 60;
      const minutes = Math.ceil(retryAfter / 60);
      throw new Error(
        `Rate limit exceeded. Please wait ${minutes} minute${minutes > 1 ? "s" : ""} before sending another message.`,
      );
    } catch {
      throw new Error("Too many requests. Please wait a moment and try again.");
    }
  }

  if (response.status === 500) {
    throw new Error("Server error. Please try again later.");
  }
  if (response.status === 503) {
    throw new Error("Service temporarily unavailable. Please try again later.");
  }
  if (response.status >= 400 && response.status < 500) {
    throw new Error(`Request failed: ${errorText || response.statusText}`);
  }
  throw new Error(`Server error (${response.status}): ${errorText || response.statusText}`);
}

function parseMessages(text: string): ChatMessage[] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as ChatMessage;
      } catch {
        return null;
      }
    })
    .filter((m): m is ChatMessage => m !== null);
}

export async function fetchChatHistory(
  userId: string,
  browserId: string,
): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/api/chats/history`, {
    headers: chatAuthHeaders(userId, browserId),
  });
  if (!response.ok) await handleApiError(response);
  const text = await response.text();
  if (!text.trim()) return [];
  return parseMessages(text);
}

export async function sendChatMessage(
  prompt: string,
  userId: string,
  browserId: string,
  onMessage: (msg: ChatMessage) => void,
): Promise<void> {
  const formData = new FormData();
  formData.append("prompt", prompt);

  const response = await fetch(`${API_BASE_URL}/api/chats/send`, {
    method: "POST",
    body: formData,
    headers: chatAuthHeaders(userId, browserId),
  });

  if (!response.ok) await handleApiError(response);
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      parseMessages(buffer).forEach(onMessage);
    }
    if (buffer.trim()) parseMessages(buffer).forEach(onMessage);
  } finally {
    reader.releaseLock();
  }
}
