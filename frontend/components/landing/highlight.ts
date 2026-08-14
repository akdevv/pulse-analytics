import { codeToHtml } from "shiki";

export type Lang = "typescript" | "sql" | "html";

export async function highlight(code: string, lang: Lang): Promise<string> {
  return codeToHtml(code, {
    lang,
    theme: "vesper",
  });
}
