import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { toast } from "sonner";
import { normalizeResponse, normalizeProduct } from "../utils/normalize";

export const useProducts = () => {
  const queryClient = useQueryClient();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await api.get("/products");
      const data = normalizeResponse(response);
      return Array.isArray(data) ? data.map(normalizeProduct) : [];
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete product");
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/products", data);
      return normalizeProduct(normalizeResponse(response));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully!");
    },
    onError: (error) => {
      toast.error(error.validationMessage || error.response?.data?.message || "Failed to create product");
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/products/${id}`, data);
      return normalizeProduct(normalizeResponse(response));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated successfully!");
    },
    onError: (error) => {
      toast.error(error.validationMessage || error.response?.data?.message || "Failed to update product");
    }
  });

  return {
    products,
    isLoading,
    error,
    createProduct: createProductMutation.mutateAsync,
    isCreating: createProductMutation.isPending,
    deleteProduct: deleteProductMutation.mutateAsync,
    isDeleting: deleteProductMutation.isPending,
    updateProduct: updateProductMutation.mutateAsync,
    isUpdating: updateProductMutation.isPending
  };
};
