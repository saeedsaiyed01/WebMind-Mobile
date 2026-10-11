import type { Memory } from "../api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  failed?: boolean;
  attachments?: Memory[];
}

export interface ChatSession {
  key: string;
  id?: string;
  historyRequest?: number;
  messages: Message[];
  attachments: Memory[];
}

let sequence = 0;
export function createId() {
  return `${Date.now()}-${++sequence}`;
}
export function createSession(attachments: Memory[] = []): ChatSession {
  return { key: createId(), messages: [], attachments };
}

export interface HistoryRow {
  _id: string;
  message: string;
  response: string;
}
export function historyMessages(rows: HistoryRow[]): Message[] {
  return rows.flatMap((row) => [
    { id: `${row._id}-u`, role: "user", text: row.message },
    { id: `${row._id}-a`, role: "assistant", text: row.response },
  ]);
}

// Async results must never overwrite a different conversation or account.
export function updateSession(
  current: ChatSession,
  key: string,
  update: (session: ChatSession) => ChatSession,
): ChatSession {
  return current.key === key ? update(current) : current;
}
