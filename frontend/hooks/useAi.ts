import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  ask,
  deleteConversation,
  getConversation,
  getConversations,
} from "@/lib/api/ai.api";
import type { AskResult } from "@/lib/types/ai.types";

export function useConversations(siteId: string) {
  return useQuery({
    queryKey: ["ai-conversations", siteId],
    queryFn: () => getConversations(siteId).then((r) => r.data),
    enabled: !!siteId,
  });
}

export function useConversation(siteId: string, conversationId?: string) {
  return useQuery({
    queryKey: ["ai-conversation", siteId, conversationId],
    queryFn: () => getConversation(siteId, conversationId!).then((r) => r.data),
    enabled: !!siteId && !!conversationId,
    // Never refetched while open. New turns are held in local state and shown
    // after this data; a background refetch would return those same turns from
    // the server and render each one twice. It also re-runs SQL server-side.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteConversation(siteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      deleteConversation(siteId, conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations", siteId] });
    },
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
        const res = await ask(siteId, question, conversationId);
        return res.data;
      } catch (err) {
        // A 422 is SQL the model wrote and the database refused — that is an
        // answer to show, not a failure to swallow. Anything else is a real error.
        const response = (
          err as AxiosError<{ data?: AskResult; message?: string }>
        ).response;
        if (response?.data?.data?.kind === "error") return response.data.data;
        // Surface the server's own wording ("Too many questions, try again
        // later") rather than axios's "Request failed with status code 429".
        throw new Error(
          response?.data?.message ?? (err as Error).message ?? "Ask failed"
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations", siteId] });
    },
  });
}
