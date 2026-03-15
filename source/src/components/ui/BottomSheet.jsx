import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onEscape = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[90dvh] overflow-hidden rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out pb-safe"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id="bottom-sheet-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-smooth"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(90dvh-56px)]">
          {children}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
