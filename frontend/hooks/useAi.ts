import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  ask,
  deleteConversation,
  getConversation,
  getConversations,
} from "@/lib/api/ai.api";
import type { AskResult } from "@/lib/types/ai.types";
import { getErrorMessage } from "@/lib/utils";

const conversationsKey = (siteId: string) => ["ai-conversations", siteId];

export function useConversations(siteId: string) {
  return useQuery({
    queryKey: conversationsKey(siteId),
    queryFn: () => getConversations(siteId),
    enabled: !!siteId,
  });
}

export function useConversation(siteId: string, conversationId?: string) {
  return useQuery({
    queryKey: ["ai-conversation", siteId, conversationId],
    queryFn: () => getConversation(siteId, conversationId!),
    enabled: !!siteId && !!conversationId,
    // New turns live in local state; a refetch would return them again and
    // render each one twice.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteConversation(siteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      deleteConversation(siteId, conversationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: conversationsKey(siteId) }),
  });
}

export function useAsk(siteId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    AskResult,
    Error,
    { question: string; conversationId?: string }
  >({
    mutationFn: async ({ question, conversationId }) => {
      try {
        return await ask(siteId, question, conversationId);
      } catch (err) {
        // A 422 carries SQL the database rejected; that is an answer to show.
        if (isAxiosError<{ data?: AskResult }>(err)) {
          const result = err.response?.data?.data;
          if (result?.kind === "error") return result;
        }
        throw new Error(getErrorMessage(err, "Ask failed"));
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: conversationsKey(siteId) }),
  });
}
