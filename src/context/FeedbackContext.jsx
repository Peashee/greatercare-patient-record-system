import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import Modal from "../components/ui/Modal";

const FeedbackContext = createContext(null);

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message, { tone = "success", title } = {}) => {
      const id = crypto.randomUUID?.() ?? String(Math.random());
      setToasts((current) => [...current.slice(-3), { id, message, tone, title }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4200);
    },
    [dismiss]
  );

  /** Promise-based replacement for window.confirm with a designed dialog. */
  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setDialog({ confirmLabel: "Confirm", tone: "danger", ...options });
      }),
    []
  );

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  };

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.tone] ?? Info;
          return (
            <div key={toast.id} className={`toast toast-${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
              <Icon size={18} className="toast-icon" />
              <div className="toast-body">
                {toast.title && <strong>{toast.title}</strong>}
                <span>{toast.message}</span>
              </div>
              <button className="icon-button ghost" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
      {dialog && (
        <Modal title={dialog.title} onClose={() => close(false)} size="sm">
          <div className="confirm-dialog">
            <span className={`confirm-icon confirm-${dialog.tone}`}>
              <AlertTriangle size={22} />
            </span>
            <p>{dialog.message}</p>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => close(false)}>Cancel</button>
            <button className={`btn ${dialog.tone === "danger" ? "btn-danger" : "btn-primary"}`} onClick={() => close(true)} autoFocus>
              {dialog.confirmLabel}
            </button>
          </div>
        </Modal>
      )}
    </FeedbackContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return context;
}
