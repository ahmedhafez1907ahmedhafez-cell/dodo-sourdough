// ============================================================
// نافذة "طريقة الاستخدام"
//
// بتظهر فوق الصفحة والخلفية وراها بتتعمللها blur — فالعميل
// لسه شايف إنه في نفس الصفحة، بس تركيزه على الكلام.
//
// بتتقفل بـ Escape أو بالضغط بره الصندوق، وبتقفل السكرول
// اللي وراها عشان الصفحة ما تتحركش تحت إيده.
// ============================================================

import { useEffect } from "react";
import Icon from "./Icon";
import { parseNotes } from "../lib/productNotes";

export default function NotesModal({ title, notes, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    // بنمنع سكرول الصفحة اللي ورا النافذة
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const blocks = parseNotes(notes);

  return (
    <div
      className="notes-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`طريقة استخدام ${title}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="notes-box">
        <div className="notes-head">
          <div>
            <span className="notes-eyebrow">طريقة الاستخدام</span>
            <h3>{title}</h3>
          </div>
          <button className="notes-close" aria-label="إغلاق" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="notes-body">
          {blocks.map((b, i) => (
            <div className="notes-block" key={i}>
              {b.title && <h4>{b.title}</h4>}
              {b.lines.map((line, j) => <p key={j}>{line}</p>)}
            </div>
          ))}
        </div>

        <button className="notes-done" onClick={onClose}>تمام، فهمت</button>
      </div>
    </div>
  );
}
