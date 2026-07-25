import { useAuthStore } from "@/store/authStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "http://localhost:8000/api";

interface StreamCallbacks {
  onText: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamChatMessage(
  sessionId: string,
  content: string,
  callbacks: StreamCallbacks
) {
  const { accessToken } = useAuthStore.getState();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    callbacks.onError("Network error — is the backend running?");
    return;
  }

  if (!response.ok || !response.body) {
    callbacks.onError(`Request failed: ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line (\n\n)
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || ""; // keep any incomplete trailing chunk for next read

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      try {
        const data = JSON.parse(jsonStr);
        if (data.text) callbacks.onText(data.text);
        if (data.done) callbacks.onDone();
        if (data.error) callbacks.onError(data.error);
      } catch {
        // incomplete/malformed chunk — skip, next read will likely complete it
      }
    }
  }
}