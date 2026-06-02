import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../services/api";
import { normalizeConversation, normalizeMessage, normalizeResponse } from "../utils/normalize";

export const useChats = ({ enabled = true } = {}) => {
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await api.get("/messages");
      const data = normalizeResponse(response);
      return Array.isArray(data) ? data.map(normalizeConversation) : [];
    },
    enabled,
    refetchInterval: 5000,
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ customerNumber, body }) => {
      const response = await api.post(`/messages/${encodeURIComponent(customerNumber)}/reply`, { body });
      return {
        message: normalizeMessage(normalizeResponse(response)),
        sent: response.status === 201,
        serverMessage: response.data?.data?.message ?? response.data?.message,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (data.sent) {
        toast.success("Message sent!");
      } else {
        toast.warning(data.serverMessage || "Message saved, but WhatsApp send failed");
      }
    },
    onError: (error) => {
      toast.error(error.validationMessage || error.response?.data?.message || "Failed to send message");
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (customerNumber) => {
      const response = await api.post(`/messages/${encodeURIComponent(customerNumber)}/read`);
      return normalizeResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    conversations,
    isLoading,
    error,
    sendReply: sendReplyMutation.mutateAsync,
    isSending: sendReplyMutation.isPending,
    markAsRead: markAsReadMutation.mutateAsync,
  };
};
