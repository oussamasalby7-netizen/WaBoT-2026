import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { toast } from "sonner";
import { normalizeResponse, normalizeBusiness } from "../utils/normalize";

export const useBusiness = () => {
  const queryClient = useQueryClient();

  const { data: business, isLoading, error } = useQuery({
    queryKey: ["business"],
    queryFn: async () => {
      const response = await api.get("/business");
      return normalizeBusiness(normalizeResponse(response));
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/business", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
      toast.success("Business settings updated!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update settings");
    }
  });

  return {
    business,
    isLoading,
    error,
    updateBusiness: updateBusinessMutation.mutateAsync,
    isUpdating: updateBusinessMutation.isPending
  };
};
