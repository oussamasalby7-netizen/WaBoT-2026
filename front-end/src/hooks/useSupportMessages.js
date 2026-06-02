import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../services/api";
import { normalizeResponse } from "../utils/normalize";

export const useSupportMessages = ({ enabled = true } = {}) => {
  const queryClient = useQueryClient();

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ["admin", "support-messages"],
    queryFn: async () => {
      const response = await api.get("/admin/support-messages");
      const data = normalizeResponse(response);
      return Array.isArray(data) ? data : [];
    },
    enabled,
    refetchInterval: 5000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, is_read, is_replied }) => {
      const response = await api.patch(`/admin/support-messages/${id}`, { is_read, is_replied });
      return normalizeResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "support-messages"] });
    },
    onError: (err) => {
      toast.error(err.validationMessage || err.response?.data?.message || "Failed to update support message");
    },
  });

  return {
    messages,
    isLoading,
    error,
    updateSupportMessage: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
