import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { toast } from "sonner";
import { normalizeResponse, normalizeOrder } from "../utils/normalize";

export const useOrders = () => {
  const queryClient = useQueryClient();

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const response = await api.get("/orders");
      const data = normalizeResponse(response);
      return Array.isArray(data) ? data.map(normalizeOrder) : [];
    },
    refetchInterval: 5000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await api.put(`/orders/${id}`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order status updated successfully!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  });

  return {
    orders,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending
  };
};
