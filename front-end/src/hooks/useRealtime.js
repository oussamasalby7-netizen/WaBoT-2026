import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEcho } from "../context/EchoContext";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useRealtime = () => {
  const echo = useEcho();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated || !user?.business?.id || !echo) {
      return;
    }

    const businessId = user.business.id;
    const channelName = `business.${businessId}`;

    echo.private(channelName)
      .listen(".MessageReceived", () => {
        toast.info("New message received!");
        // Invalidate conversations cache so Chats.jsx re-fetches
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .listen(".OrderCreated", () => {
        toast.info("New order created!");
        // Invalidate orders and products cache so UI re-fetches updated data
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
      })
      .listen(".OrderUpdated", () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      });

    return () => {
      echo.leave(channelName);
    };
  }, [echo, queryClient, user, isAuthenticated]);
};
