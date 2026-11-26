import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Modal({ title, description, onClose, children, size = "md" }) {
  const panel = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    panel.current?.querySelector("[autofocus], input, select, textarea, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
      previous?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title} ref={panel}>
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button ghost" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
