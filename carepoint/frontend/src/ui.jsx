import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { initials } from "./api";

const paths = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8",
  steth: "M6 3v6a4 4 0 0 0 8 0V3M10 13v2a5 5 0 0 0 10 0v-2M20 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 3h2M13 3h2",
  calendar: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  plus: "M12 5v14M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3",
  x: "M6 6l12 12M18 6 6 18",
  logout: "M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6",
  check: "M5 12l5 5L20 7",
  lock: "M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4",
};
export const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>
);

export const Badge = ({ status, children }) => <span className={`badge ${status}`}>{children || status}</span>;
export const Avatar = ({ name, tone = 0 }) => <span className={`avatar t${tone % 5}`} aria-hidden="true">{initials(name)}</span>;

export function Pager({ data, page, setPage, size = 10 }) {
  if (!data || (!data.next && !data.previous)) return null;
  return (
    <div className="pager">
      <button className="btn ghost sm" disabled={!data.previous} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page} of {Math.ceil(data.count / size)}</span>
      <button className="btn ghost sm" disabled={!data.next} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
}

export function Empty({ icon = "users", title, children }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={26} /></div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export const Skeleton = ({ rows = 4 }) => (
  <div className="panel">{Array.from({ length: rows }, (_, i) => <div key={i} className="skel" />)}</div>
);

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, children, confirmLabel = "Confirm", danger, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button className="btn ghost" onClick={onClose}>Keep</button>
      <button className={`btn ${danger ? "danger" : ""}`} onClick={onConfirm}>{confirmLabel}</button>
    </>}>
      <p className="muted" style={{ margin: 0 }}>{children}</p>
    </Modal>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, kind = "ok") => {
    const id = Math.random();
    setItems((x) => [...x, { id, text, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast ${t.kind}`}><Icon name={t.kind === "ok" ? "check" : "x"} size={16} />{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
