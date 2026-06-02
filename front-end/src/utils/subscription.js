/**
 * PRO-only SaaS: access requires a PRO plan with a future period end (mirrors backend).
 */
export function getSubscriptionState(user) {
  const explicitState = user?.subscriptionState || user?.subscription_state;
  if (["active", "pending", "expired"].includes(explicitState)) {
    return explicitState;
  }

  const plan = user?.subscriptionPlan ?? user?.subscription_plan;
  const periodEnd = user?.subscriptionPeriodEnd ?? user?.subscription_period_end;
  if (plan !== "pro" || !periodEnd) {
    return "pending";
  }

  const end = new Date(periodEnd);
  if (Number.isNaN(end.getTime())) {
    return "pending";
  }

  return end > new Date() ? "active" : "expired";
}

export function userHasActiveProAccess(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.isBlocked) return false;

  const plan = user.subscriptionPlan ?? user.subscription_plan;
  const status = user.subscriptionStatus ?? user.subscription_status;
  const periodEnd = user.subscriptionPeriodEnd ?? user.subscription_period_end;

  // WHY billing_status can show "active" while access is still denied:
  // ─────────────────────────────────────────────────────────────────────
  // `subscriptionState` (returned by the API and displayed in BillingRequired)
  // is a human-readable label that can be "active", "pending", or "expired".
  // It is derived from `getSubscriptionState()` which only looks at the state
  // field / period-end date — it does NOT check subscriptionStatus or plan.
  //
  // `userHasActiveProAccess` (used by route guards) requires ALL THREE:
  //   1. plan === "pro"      (or status === "pro" for legacy accounts)
  //   2. subscriptionStatus  must be present
  //   3. periodEnd           must exist AND be in the future
  //
  // So a user whose account has state="active" (e.g. set manually in the DB)
  // but has no periodEnd or a non-pro plan will still be blocked by the gate.
  // The admin can activate access via the Admin panel → "Activate 30 Days".
  // ─────────────────────────────────────────────────────────────────────

  // IMPORTANT FIX: If expired, automatically treat as inactive
  if (periodEnd && new Date(periodEnd) < new Date()) {
    return false;
  }

  return (plan === "pro" || status === "pro") && periodEnd && new Date(periodEnd) > new Date();
}

