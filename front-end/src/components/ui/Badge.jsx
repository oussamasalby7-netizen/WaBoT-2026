export default function Badge({ children, variant = "neutral", className }) { // NOSONAR
  return (
    <span className={`badge badge-${variant} ${className || ""}`}>
      {children}
    </span>
  );
}

