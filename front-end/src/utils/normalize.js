import { getSubscriptionState } from "./subscription.js";

/**
 * Normalizes API responses handling Laravel's 'data' wrapper
 */
export const normalizeResponse = (res) => {
  return res.data?.data ?? res.data;
};

/**
 * Maps snake_case backend fields to camelCase frontend fields
 */
export const normalizeOrder = (order) => ({
  id: order.id,
  businessId: order.business_id,
  messageId: order.message_id,
  customerName: order.customer_name || "Unknown Customer",
  customerAddress: order.customer_address || "No address provided",
  customerPhone: order.customer_phone || "N/A",
  productName: order.product_name || "Product not specified",
  quantity: order.quantity || 0,
  totalPrice: parseFloat(order.total_price || 0),
  status: order.status || "pending",
  createdAt: order.created_at,
  updatedAt: order.updated_at,
});

export const normalizeProduct = (product) => ({
  id: product.id,
  businessId: product.business_id,
  name: product.name || "Unnamed Product",
  price: parseFloat(product.price || 0),
  description: product.description || "",
  aiQuestions: product.ai_questions || product.aiQuestions || "",
  stock: product.stock || 0,
  imageUrl: product.image_url,
  createdAt: product.created_at,
  updatedAt: product.updated_at,
});

export const normalizeBusiness = (business) => ({
  id: business?.id,
  userId: business?.user_id,
  name: business?.name || "",
  description: business?.description || "",
  phone: business?.phone || "",
  whatsappPhoneNumberId: business?.whatsapp_phone_number_id || "",
});

export const normalizeUser = (user) => ({
  id: user?.id,
  name: user?.name || "User",
  email: user?.email || "",
  role: user?.role || "user",
  subscriptionStatus: user?.subscription_status || "pending_payment",
  subscriptionPlan: user?.subscription_plan || null,
  subscriptionPeriodEnd: user?.subscription_period_end || null,
  subscriptionState: getSubscriptionState(user),
  lastPaymentAt: user?.last_payment_at || null,
  nextBillingAt: user?.next_billing_at || null,
  paymentFailedAt: user?.payment_failed_at || null,
  isBlocked: Boolean(user?.is_blocked),
  credits: Number(user?.credits ?? 0),
  locale: user?.locale || "fr",
  themePreference: user?.theme_preference || null,
  createdAt: user?.created_at,
  updatedAt: user?.updated_at,
  business: user?.business ? normalizeBusiness(user.business) : null,
});

export const normalizeMessage = (message) => ({
  id: message.id,
  text: message.body || message.text || "",
  sender: message.sender || (message.from_number === "AI_ASSISTANT" ? "ai" : "customer"),
  fromNumber: message.from_number,
  customerNumber: message.customer_number,
  createdAt: message.created_at,
});

export const normalizeConversation = (conversation) => ({
  customerNumber: conversation.customer_number,
  name: conversation.name || conversation.customer_number || "Unknown Customer",
  lastMessage: conversation.last_message || "",
  lastMessageAt: conversation.last_message_at,
  unread: conversation.unread || 0,
  messages: Array.isArray(conversation.messages) ? conversation.messages.map(normalizeMessage) : [],
});
