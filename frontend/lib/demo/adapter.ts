import {
  AxiosError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from "axios";
import * as ai from "@/lib/demo/ai";
import * as data from "@/lib/demo/data";
import type { Site } from "@/lib/types/site.types";

const sites: Site[] = data.DEMO_SITES.map((site) => ({ ...site }));
const user = { ...data.DEMO_USER };

type Handler = (args: {
  match: RegExpMatchArray;
  params: Record<string, string>;
  body: Record<string, unknown>;
}) => unknown;

type Route = [method: string, pattern: RegExp, handler: Handler];

class DemoError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function findSite(id: string) {
  const site = sites.find((s) => s.id === id);
  if (!site) throw new DemoError(404, "Site not found");
  return site;
}

const randomKey = () =>
  `pk-${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

const range = (params: Record<string, string>) => ({
  from: params.from ?? new Date(Date.now() - 7 * 86_400_000).toISOString(),
  to: params.to ?? new Date().toISOString(),
  interval: params.interval as "hour" | "day" | undefined,
  limit: params.limit ? Number(params.limit) : undefined,
});

const analytics = (
  name: string,
  fn: (siteId: string, r: ReturnType<typeof range>) => unknown
): Route => [
  "get",
  new RegExp(`^analytics/([^/]+)/${name}$`),
  ({ match, params }) => fn(findSite(match[1]!).id, range(params)),
];

const session = () => ({ accessToken: "demo" });

const ROUTES: Route[] = [
  ["post", /^auth\/(refresh|login|register)$/, session],
  ["post", /^auth\/logout$/, () => null],
  ["get", /^auth\/me$/, () => user],
  [
    "patch",
    /^auth\/me$/,
    ({ body }) => {
      if (typeof body.name === "string") user.name = body.name;
      if (typeof body.email === "string") user.email = body.email;
      return user;
    },
  ],

  ["get", /^sites$/, () => sites],
  [
    "post",
    /^sites$/,
    ({ body }) => {
      const site: Site = {
        id: `demo-${Date.now().toString(36)}`,
        name: String(body.name),
        domain: String(body.domain),
        userId: user.id,
        trackingId: randomKey(),
        rateLimitTier: "FREE",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sites.push(site);
      return site;
    },
  ],
  ["get", /^sites\/([^/]+)$/, ({ match }) => findSite(match[1]!)],
  [
    "put",
    /^sites\/([^/]+)$/,
    ({ match, body }) =>
      Object.assign(findSite(match[1]!), body, {
        updatedAt: new Date().toISOString(),
      }),
  ],
  [
    "delete",
    /^sites\/([^/]+)$/,
    ({ match }) => {
      sites.splice(sites.indexOf(findSite(match[1]!)), 1);
      return null;
    },
  ],
  [
    "post",
    /^sites\/([^/]+)\/regen-key$/,
    ({ match }) =>
      Object.assign(findSite(match[1]!), { trackingId: randomKey() }),
  ],

  analytics("overview", data.overview),
  analytics("timeseries", data.timeseries),
  analytics("pages", data.pages),
  analytics("referrers", data.referrers),
  analytics("devices", data.devices),
  analytics("geo", data.geo),
  analytics("events", data.events),
  [
    "get",
    /^analytics\/([^/]+)\/events\/properties$/,
    ({ match, params }) =>
      data.eventProperties(match[1]!, params.name ?? "", range(params)),
  ],

  [
    "post",
    /^ai\/([^/]+)\/ask$/,
    ({ match, body }) =>
      ai.ask(
        match[1]!,
        String(body.question ?? ""),
        body.conversationId as string | undefined
      ),
  ],
  [
    "get",
    /^ai\/([^/]+)\/conversations$/,
    ({ match }) => ai.listConversations(match[1]!),
  ],
  [
    "get",
    /^ai\/([^/]+)\/conversations\/([^/]+)$/,
    ({ match }) => {
      const convo = ai.getConversation(match[1]!, match[2]!);
      if (!convo) throw new DemoError(404, "Conversation not found");
      return convo;
    },
  ],
  [
    "delete",
    /^ai\/([^/]+)\/conversations\/([^/]+)$/,
    ({ match }) => {
      ai.deleteConversation(match[1]!, match[2]!);
      return null;
    },
  ],
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseBody(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string" || !raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export const demoAdapter: AxiosAdapter = async (
  config: InternalAxiosRequestConfig
) => {
  const method = (config.method ?? "get").toLowerCase();
  const path = (config.url ?? "").replace(/^\/+/, "").split("?")[0]!;
  const isAsk = path.endsWith("/ask");
  await sleep(isAsk ? 900 + Math.random() * 700 : 150 + Math.random() * 250);

  const respond = (status: number, payload: unknown) => ({
    data: payload,
    status,
    statusText: String(status),
    headers: {},
    config,
    request: {},
  });

  for (const [routeMethod, pattern, handler] of ROUTES) {
    const match = path.match(pattern);
    if (routeMethod !== method || !match) continue;
    try {
      const result = handler({
        match,
        params: (config.params ?? {}) as Record<string, string>,
        body: parseBody(config.data),
      });
      return respond(200, { status: "success", message: "ok", data: result });
    } catch (err) {
      const status = err instanceof DemoError ? err.status : 500;
      const message = err instanceof Error ? err.message : "Demo error";
      throw new AxiosError(
        message,
        String(status),
        config,
        {},
        respond(status, { status: "error", message })
      );
    }
  }

  const message = `The demo does not support ${method.toUpperCase()} /${path}`;
  throw new AxiosError(
    message,
    "404",
    config,
    {},
    respond(404, { status: "error", message })
  );
};
