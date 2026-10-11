import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ApiError, chat, request, type Model } from "../api";
import {
  createId,
  historyMessages,
  updateSession,
  type ChatSession,
  type HistoryRow,
  type Message,
} from "./session";

export function useChat({
  session,
  setSession,
  model,
  onBusy,
  onComplete,
}: {
  session: ChatSession;
  setSession: React.Dispatch<React.SetStateAction<ChatSession>>;
  model: Model;
  onBusy: (busy: boolean) => void;
  onComplete: (credits: number) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("working");
  const [error, setError] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const current = useRef(session);
  useLayoutEffect(() => {
    current.current = session;
  }, [session]);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const snapshot = current.current;
    const needsHistory = !!snapshot.id && !snapshot.messages.length;
    Promise.resolve().then(() => {
      if (!alive) return;
      setInput("");
      setError("");
      setUpgrade(false);
      setHistoryFailed(false);
      setLoadingHistory(needsHistory);
    });
    if (needsHistory) {
      request<HistoryRow[]>(
        `/conversation/${snapshot.id}`,
        "GET",
        undefined,
        controller.signal,
      )
        .then((rows) => {
          if (alive)
            setSession((prev) =>
              updateSession(prev, snapshot.key, (value) => ({
                ...value,
                messages: historyMessages(rows),
              })),
            );
        })
        .catch((failure: Error) => {
          if (alive) {
            setError(failure.message);
            setHistoryFailed(true);
          }
        })
        .finally(() => {
          if (alive) setLoadingHistory(false);
        });
    }
    return () => {
      alive = false;
      controller.abort();
    };
  }, [session.key, session.historyRequest, setSession]);

  const send = useCallback(
    async (text: string, retry?: Message) => {
      text = text.trim();
      if (!text || abort.current || loadingHistory || historyFailed) return;
      const snapshot = current.current;
      const id = retry?.id || createId();
      const attachments = retry?.attachments || snapshot.attachments;
      const controller = new AbortController();
      abort.current = controller;
      setError("");
      setUpgrade(false);
      setInput("");
      setBusy(true);
      onBusy(true);
      setPhase("working");
      setSession((prev) =>
        updateSession(prev, snapshot.key, (value) => ({
          ...value,
          messages: retry
            ? value.messages.map((m) =>
                m.id === id ? { ...m, failed: false } : m,
              )
            : [...value.messages, { id, role: "user", text, attachments }],
          attachments: retry ? value.attachments : [],
        })),
      );
      try {
        const result = await chat(
          {
            message: text,
            conversationId: snapshot.id,
            model: model.id,
            attachedDocumentIds: attachments.map((item) => item._id),
          },
          setPhase,
          controller.signal,
        );
        if (controller.signal.aborted || current.current.key !== snapshot.key)
          return;
        setSession((prev) =>
          updateSession(prev, snapshot.key, (value) => ({
            ...value,
            id: result.conversationId,
            messages: [
              ...value.messages,
              { id: `${id}-answer`, role: "assistant", text: result.answer },
            ],
          })),
        );
        onComplete(result.remainingCredits);
      } catch (failure) {
        if (current.current.key !== snapshot.key) return;
        setError(
          controller.signal.aborted
            ? "Response stopped. You can retry this message."
            : (failure as Error).message,
        );
        setUpgrade(failure instanceof ApiError && failure.needsUpgrade);
        setSession((prev) =>
          updateSession(prev, snapshot.key, (value) => ({
            ...value,
            messages: value.messages.map((m) =>
              m.id === id ? { ...m, failed: true } : m,
            ),
          })),
        );
      } finally {
        abort.current = null;
        setBusy(false);
        onBusy(false);
      }
    },
    [loadingHistory, historyFailed, model.id, setSession, onBusy, onComplete],
  );

  return {
    input,
    setInput,
    busy,
    phase,
    error,
    upgrade,
    loadingHistory,
    historyFailed,
    send,
    stop: () => abort.current?.abort(),
    retryHistory: () =>
      setSession((prev) => ({
        ...prev,
        historyRequest: (prev.historyRequest || 0) + 1,
      })),
  };
}
