/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'تأكيد الحذف',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 flex flex-col items-center text-center space-y-4"
        >
          <div className="p-3 bg-red-50 text-red-600 rounded-full">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-navy text-sm">{title}</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">{message}</p>
          </div>

          <div className="flex gap-3 w-full pt-2">
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-xs cursor-pointer shadow-sm"
            >
              {confirmText}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs cursor-pointer"
            >
              {cancelText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
