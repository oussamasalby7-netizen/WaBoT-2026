export default function Skeleton({ className, ...props }) { // NOSONAR
  return (
    <div
      className={`skeleton ${className || ""}`}
      {...props}
    />
  );
}
