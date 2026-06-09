import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

export default function Button({ // NOSONAR
  children, 
  className, 
  variant = "primary", 
  isLoading = false, 
  disabled = false,
  ...props 
}) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    outline: "btn-outline",
    ghost: "btn-ghost",
    danger: "btn-danger",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={cn("btn", variants[variant] || "btn-primary", className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <div className="spinner" />
      ) : (
        children
      )}
    </motion.button>
  );
}
