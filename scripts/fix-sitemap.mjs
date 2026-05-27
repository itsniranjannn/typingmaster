import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sitemapPath = resolve(process.cwd(), "dist/sitemap.xml");
const allowedRoutes = new Set(["/", "/legal", "/privacy", "/terms", "/contact"]);

try {
  const sitemapXml = await readFile(sitemapPath, "utf8");
  const urlBlocks = sitemapXml.match(/<url>[\s\S]*?<\/url>/g) || [];

  const filteredBlocks = urlBlocks.filter((block) => {
    const locMatch = block.match(/<loc>(.*?)<\/loc>/);
    if (!locMatch) return false;

    try {
      const pathname = new URL(locMatch[1]).pathname;
      return allowedRoutes.has(pathname);
    } catch {
      return false;
    }
  });

  const head = sitemapXml.split(/<url>[\s\S]*?<\/url>/)[0] || "";
  const tailMatch = sitemapXml.match(/(<\/urlset>\s*)$/);
  const tail = tailMatch ? tailMatch[1] : "</urlset>";
  const nextXml = `${head}${filteredBlocks.join("")}${tail}`;

  if (nextXml !== sitemapXml) {
    await writeFile(sitemapPath, nextXml, "utf8");
  }
} catch {
  process.exitCode = 1;
  console.error(`Unable to sanitize sitemap at ${sitemapPath}`);
}
