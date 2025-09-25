import fs from "fs/promises";

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mdToHtml(md: string) {
  // Escape, then apply a few common Markdown transforms
  let s = escapeHtml(md);

  // Links [text](url)
  s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>');

  // Bold **text** and italic *text*
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headings
  s = s.replace(/^###\s+(.+)$/gm, '<h3 class="text-xl font-semibold mt-8 mb-3">$1</h3>');
  s = s.replace(/^##\s+(.+)$/gm, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>');
  s = s.replace(/^#\s+(.+)$/gm, '<h1 class="text-3xl font-bold mt-12 mb-6">$1</h1>');

  // Paragraphs: split on blank lines to avoid wrapping headings
  const blocks = s.split(/\n\s*\n/g).map((block) => {
    if (/^<h[1-3]\b/.test(block)) return block;
    return `<p class="leading-7 text-white/90">${block.replace(/\n/g, '<br/>')}</p>`;
  });

  return blocks.join("\n");
}

export const dynamic = "force-static";

export default async function TermsOfServicePage() {
  let md = "";
  try {
    md = await fs.readFile(process.cwd() + "/tos.md", "utf8");
  } catch (e) {
    md = "# Terms of Service\n\nThe terms document could not be loaded.";
  }

  const html = mdToHtml(md);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <article
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

