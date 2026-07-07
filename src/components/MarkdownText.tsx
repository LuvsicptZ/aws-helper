interface MarkdownTextProps {
  text: string;
}

export function MarkdownText({ text }: MarkdownTextProps) {
  if (!text) return null;

  // Split by markdown links, bold text, inline code, and bare URLs.
  const regex =
    /(\[.*?\]\(.*?\))|(\*\*.*?\*\*)|(`.*?`)|((?:https?:\/\/)[^\s()<>]+(?:(?:\([^\s()<>]+\))|[^\s`!()[\]{};:'".,<>?]))/g;
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // 1. Markdown link: [text](url)
        if (part.startsWith("[") && part.includes("](")) {
          const match = part.match(/\[(.*?)\]\((.*?)\)/);
          if (match) {
            const [, linkText, linkUrl] = match;
            return (
              <a
                key={index}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                {linkText}
              </a>
            );
          }
        }

        // 2. Bold text: **text**
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }

        // 3. Inline code: `code`
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="px-1.5 py-0.5 mx-0.5 font-mono text-[0.88em] bg-gray-100 dark:bg-slate-800 border border-gray-200/50 dark:border-slate-700/50 rounded text-amber-700 dark:text-amber-400 font-medium"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        // 4. Bare URL: http://... or https://...
        if (part.startsWith("http://") || part.startsWith("https://")) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              style={{ wordBreak: "break-all" }}
            >
              {part}
            </a>
          );
        }

        return part;
      })}
    </>
  );
}
