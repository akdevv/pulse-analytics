import type { Request, Response } from "express";
import { AppError } from "@/utils/app-error.ts";
import * as AiService from "./ai.service.ts";
import { askSchema } from "./ai.types.ts";

const siteIdOf = (req: Request): string => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");
  return siteId;
};

// POST /:siteId/ask
export const ask = async (req: Request, res: Response) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const result = await AiService.ask(
    siteIdOf(req),
    req.user!.userId,
    parsed.data.question,
    parsed.data.conversationId
  );

  // SQL the model wrote twice and the database refused twice is a real answer
  // to give the user, not a server fault — 422, not 500.
  const status = result.kind === "error" ? 422 : 200;

  return res.status(status).json({
    status: result.kind === "error" ? "error" : "success",
    data: result,
  });
};

// GET /:siteId/conversations
export const listConversations = async (req: Request, res: Response) => {
  const data = await AiService.listConversations(siteIdOf(req), req.user!.userId);
  return res.status(200).json({ status: "success", data });
};

// DELETE /:siteId/conversations/:conversationId
export const deleteConversation = async (req: Request, res: Response) => {
  await AiService.deleteConversation(
    siteIdOf(req),
    req.user!.userId,
    req.params.conversationId as string
  );
  return res.status(204).send();
};

// GET /:siteId/conversations/:conversationId
export const getConversation = async (req: Request, res: Response) => {
  const data = await AiService.getConversation(
    siteIdOf(req),
    req.user!.userId,
    req.params.conversationId as string
  );
  return res.status(200).json({ status: "success", data });
};
