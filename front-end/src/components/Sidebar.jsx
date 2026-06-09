import { useMemo } from "react";

import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  MessageSquare,
  Settings,
  ShieldCheck,
  LogOut,
  X,
  MessageCircle,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../context/I18nContext.jsx";
import { useChats } from "../hooks/useChats";
import { useSupportMessages } from "../hooks/useSupportMessages";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar({ isOpen, onClose }) { // NOSONAR
  const { logout, isAdmin } = useAuth();
  const { t } = useI18n();

  // Fetch unread data
  const { conversations = [] } = useChats({ enabled: !isAdmin });
  const { messages = [] } = useSupportMessages({ enabled: isAdmin });

  // Calculate unread counts
  const totalUnreadChats = useMemo(() => {
    if (isAdmin) return 0;
    return conversations.reduce((acc, conv) => acc + (conv.unread || 0), 0);
  }, [conversations, isAdmin]);

  const totalUnreadSupport = useMemo(() => {
    if (!isAdmin) return 0;
    return messages.filter((m) => !m.is_read).length;
  }, [messages, isAdmin]);

  const userNavItems = useMemo(
    () => [
      { icon: LayoutDashboard, label: t("nav.dashboard"), href: "/dashboard" },
      { icon: ShoppingBag, label: t("nav.orders"), href: "/orders" },
      { icon: Package, label: t("nav.products"), href: "/products" },
      { icon: MessageSquare, label: t("nav.chats"), href: "/chats", badge: totalUnreadChats },
      { icon: CreditCard, label: t("admin.users.billing"), href: "/billing-required" },
      { icon: Settings, label: t("nav.settings"), href: "/settings" },
    ],
    [t, totalUnreadChats]
  );

  const adminNavItems = useMemo(
    () => [
      { icon: ShieldCheck, label: t("nav.admin"), href: "/admin" },
      { icon: MessageCircle, label: t("admin.support.title"), href: "/admin/messages", badge: totalUnreadSupport },
    ],
    [t, totalUnreadSupport]
  );

  const visibleNavItems = isAdmin ? adminNavItems : userNavItems;

  const sidebarContent = (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <span>W</span>
          </div>
          <span className="sidebar-title">WaBOT</span>
        </div>
        <button type="button" onClick={onClose} className="mobile-menu-btn">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/admin" || item.href === "/dashboard"}
            onClick={() => globalThis.innerWidth < 1024 && onClose()}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <item.icon className="nav-icon" />
            <span>{item.label}</span>
            {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" onClick={logout} className="logout-btn">
          <LogOut className="nav-icon" />
          <span>{t("nav.logout")}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sidebar-desktop-wrapper">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="sidebar-overlay"
              style={{ display: "block" }}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="sidebar-mobile-wrapper"
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

