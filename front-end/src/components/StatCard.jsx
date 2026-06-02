import { motion } from "framer-motion";

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "primary",
  description,
  children,
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="stat-card"
    >
      {/* ROW 1: Icon (left) + Trend badge (right) */}
      <div className="stat-card-header">
        <div className={`stat-icon-wrapper ${color}`}>
          <Icon size={22} />
        </div>
        {trend && (
          <div className={`stat-trend ${trend.isUp ? "up" : "down"}`}>
            {trend.isUp ? "↑" : "↓"} {trend.value}%
          </div>
        )}
      </div>

      {/* ROW 2+3: Title, Value, Description */}
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>

        {/* Mini chart (optional children slot) */}
        {children && (
          <div className="stat-chart-slot">{children}</div>
        )}

        {description && (
          <p className="stat-description">{description}</p>
        )}
      </div>

      {/* Decorative glow — purely decorative, z-index 0 */}
      <div className={`stat-glow ${color}`} />
    </motion.div>
  );
}

