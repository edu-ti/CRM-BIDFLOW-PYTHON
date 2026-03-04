import React from "react";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

export type ConfirmModalType = "success" | "error" | "warning" | "info";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: ConfirmModalType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "info",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  showCancel = true,
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      buttonColor: "bg-green-600 hover:bg-green-700",
    },
    error: {
      icon: XCircle,
      bgColor: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      buttonColor: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      buttonColor: "bg-yellow-600 hover:bg-yellow-700",
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const { icon: Icon, bgColor, iconColor, buttonColor } = typeConfig[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-md p-4 h-auto">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${bgColor} ${iconColor} mb-4`}
            >
              <Icon className="h-8 w-8" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3
                className="text-xl leading-6 font-semibold text-gray-900 dark:text-white"
                id="modal-title"
              >
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {message}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-2xl">
            {onConfirm && (
              <button
                type="button"
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${buttonColor} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors`}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmText}
              </button>
            )}
            {showCancel && (
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                onClick={onClose}
              >
                {cancelText}
              </button>
            )}
            {!onConfirm && !showCancel && (
              <button
                type="button"
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${buttonColor} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors`}
                onClick={onClose}
              >
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
