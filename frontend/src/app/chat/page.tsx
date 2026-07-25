"use client";

import { useEffect, useRef, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiClient } from "@/lib/apiClient";
import { streamChatMessage } from "@/lib/chatStream";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  last_active_at: string;
  messages: ChatMessage[];
}

function extractList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export default function ChatPage() {
  const { accessToken } = useRequireAuth();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = () => {
    apiClient<any>("chat/sessions")
      .then((data) => setSessions(extractList<ChatSession>(data)))
      .catch((err) => setError(err.message || "Failed to load chat sessions"));
  };

  useEffect(() => {
    if (!accessToken) return;
    loadSessions();
  }, [accessToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  const startNewSession = async () => {
    setError(null);
    try {
      const session = await apiClient<ChatSession>("chat/sessions", {
        method: "POST",
        body: { title: "New Chat" },
      });
      setSessions((prev) => [session, ...prev]);
      setActiveSession({ ...session, messages: session.messages || [] });
    } catch (err: any) {
      setError(err.message || "Failed to start new chat");
    }
  };

  const openSession = async (sessionId: string) => {
    setError(null);
    try {
      const session = await apiClient<ChatSession>(`chat/sessions/${sessionId}`);
      setActiveSession(session);
    } catch (err: any) {
      setError(err.message || "Failed to load chat");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeSession || streaming) return;

    const userText = input;
    setInput("");
    setError(null);
    setStreaming(true);

    // Optimistically add the user's message + an empty assistant bubble to fill in
    const userMsg: ChatMessage = { id: `temp-user-${Date.now()}`, role: "user", content: userText };
    const assistantMsg: ChatMessage = { id: `temp-assistant-${Date.now()}`, role: "assistant", content: "" };

    setActiveSession((prev) =>
      prev ? { ...prev, messages: [...prev.messages, userMsg, assistantMsg] } : prev
    );

    await streamChatMessage(activeSession.id, userText, {
      onText: (text) => {
        setActiveSession((prev) => {
          if (!prev) return prev;
          const messages = [...prev.messages];
          const last = messages[messages.length - 1];
          messages[messages.length - 1] = { ...last, content: last.content + text };
          return { ...prev, messages };
        });
      },
      onDone: () => {
        setStreaming(false);
      },
      onError: (err) => {
        setError(err);
        setStreaming(false);
      },
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-72 border-r border-[#2F4538]/10 bg-[#FAF7F0] p-4 flex flex-col">
        <button
          onClick={startNewSession}
          className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] font-semibold py-2 px-4 rounded-sm mb-4"
        >
          New Chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => openSession(s.id)}
              className={`w-full text-left px-3 py-2 rounded-sm text-sm truncate ${
                activeSession?.id === s.id ? "bg-[#2F4538]/10 text-[#2F4538]" : "hover:bg-[#2F4538]/5"
              }`}
            >
              {s.title || "Untitled chat"}
            </button>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col">
        {error && (
          <p className="bg-[#8B3A2B]/10 border-b border-[#8B3A2B]/20 text-[#8B3A2B] text-sm p-3">{error}</p>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!activeSession ? (
            <p className="text-[#2B2620]/60">Start a new chat or pick one from the sidebar.</p>
          ) : (
            activeSession.messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-lg rounded-sm px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-[#2F4538] text-[#EDE7D9] ml-auto"
                    : "bg-[#FAF7F0] text-[#2B2620]"
                }`}
              >
                {msg.content || (streaming ? "..." : "")}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {activeSession && (
          <div className="p-4 border-t border-[#2F4538]/10 bg-[#FAF7F0] flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={streaming}
              placeholder="Ask about books..."
              className="flex-1 border border-[#2F4538]/20 rounded-sm px-3 py-2 bg-white"
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              className="bg-[#2F4538] hover:bg-[#26392c] text-[#EDE7D9] font-semibold px-4 py-2 rounded-sm disabled:opacity-50"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}