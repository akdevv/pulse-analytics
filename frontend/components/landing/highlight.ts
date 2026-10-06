import { codeToHtml } from "shiki";
import { transformerNotationHighlight } from "@shikijs/transformers";

export type Lang = "typescript" | "tsx" | "sql" | "html";

// Server-only: mark a line with `// [!code highlight]` to emphasise it.
export function highlight(code: string, lang: Lang) {
  return codeToHtml(code, {
    lang,
    theme: "vesper",
    transformers: [transformerNotationHighlight()],
  });
}
