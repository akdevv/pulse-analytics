import type { Request, Response } from "express";
import * as AiService from "./ai.service.ts";
import { askSchema } from "./ai.types.ts";
import { paramOf, userIdOf } from "@/utils/request-scope.ts";

const siteIdOf = (req: Request): string => paramOf(req, "siteId", "Site ID");

export const ask = async (req: Request, res: Response) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const result = await AiService.ask(
    siteIdOf(req),
    userIdOf(req),
    parsed.data.question,
    parsed.data.conversationId
  );

  // SQL the model got wrong twice is an answer, not a server fault.
  const status = result.kind === "error" ? 422 : 200;

  return res.status(status).json({
    status: result.kind === "error" ? "error" : "success",
    data: result,
  });
};

export const listConversations = async (req: Request, res: Response) => {
  const data = await AiService.listConversations(siteIdOf(req), userIdOf(req));
  return res.status(200).json({ status: "success", data });
};

export const deleteConversation = async (req: Request, res: Response) => {
  await AiService.deleteConversation(
    siteIdOf(req),
    userIdOf(req),
    req.params.conversationId as string
  );
  return res.status(204).send();
};

export const getConversation = async (req: Request, res: Response) => {
  const data = await AiService.getConversation(
    siteIdOf(req),
    userIdOf(req),
    req.params.conversationId as string
  );
  return res.status(200).json({ status: "success", data });
};
