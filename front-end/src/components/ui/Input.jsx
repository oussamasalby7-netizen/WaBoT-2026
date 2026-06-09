import { cn } from "../../utils/cn";

export default function Input({ label, error, className, ...props }) { // NOSONAR
  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label}
        </label>
      )}
      <input
        className={cn("input-field", error && "error", className)}
        {...props}
      />
      {error && (
        <span className="input-error-text">{error}</span>
      )}
    </div>
  );
}
