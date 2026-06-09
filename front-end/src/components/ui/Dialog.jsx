import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import Button from "./Button";

export default function Dialog({ // NOSONAR
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="dialog-overlay">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="dialog-backdrop"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            className="dialog-card"
          >
            <button 
              onClick={onClose}
              className="dialog-close-btn"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className={`dialog-icon ${variant}`}>
              <AlertCircle size={28} />
            </div>

            <h3 className="dialog-title">{title}</h3>
            <p className="dialog-description">{description}</p>

            <div className="dialog-actions">
              <Button 
                variant="secondary" 
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button 
                variant={variant} 
                onClick={onConfirm}
                isLoading={isLoading}
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

