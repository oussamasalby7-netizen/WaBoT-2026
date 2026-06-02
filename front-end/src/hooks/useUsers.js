import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../services/api";
import { normalizeResponse, normalizeUser } from "../utils/normalize";

export const useUsers = () => {
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const response = await api.get("/admin/users");
      const data = normalizeResponse(response);
      return Array.isArray(data) ? data.map(normalizeUser) : [];
    },
    refetchInterval: 10000,
  });

  const toggleBlockMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/admin/users/${id}/toggle-block`);
      return normalizeUser(normalizeResponse(response));
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`${user.name} is now ${user.isBlocked ? "blocked" : "unblocked"}.`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update user status");
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, subscription_state, subscription_period_end, next_billing_at }) => {
      const response = await api.put(`/admin/users/${id}/subscription`, {
        subscription_state,
        subscription_period_end,
        next_billing_at,
      });
      return normalizeUser(normalizeResponse(response));
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`${user.name}'s subscription was updated.`);
    },
    onError: (error) => {
      toast.error(error.validationMessage || error.response?.data?.message || "Failed to update subscription");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/admin/users/${id}`);
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(response.data?.message || "User deleted successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete user");
    },
  });

  return {
    users,
    isLoading,
    error,
    toggleBlock: toggleBlockMutation.mutateAsync,
    isTogglingBlock: toggleBlockMutation.isPending,
    updateSubscription: updateSubscriptionMutation.mutateAsync,
    isUpdatingSubscription: updateSubscriptionMutation.isPending,
    deleteUser: deleteUserMutation.mutateAsync,
    isDeletingUser: deleteUserMutation.isPending,
  };
};
