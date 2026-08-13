import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.js";

const KNOWN = new Set(["API-001", "TICK-001"]);

describe("renderMarkdown wiki links", () => {
  it("renders an inline wiki link as a live anchor", () => {
    const html = renderMarkdown("See [[API-001]] for the shape.", KNOWN);
    expect(html).toContain('<a href="kanmer:API-001" class="wikilink">API-001</a>');
  });

  it("marks an unknown id as missing", () => {
    const html = renderMarkdown("See [[NOPE-9]].", KNOWN);
    expect(html).toContain('class="wikilink missing"');
    expect(html).toContain('href="kanmer:NOPE-9"');
  });

  it("honours the [[id|alias]] label", () => {
    const html = renderMarkdown("See [[API-001|the API ticket]].", KNOWN);
    expect(html).toContain('<a href="kanmer:API-001" class="wikilink">the API ticket</a>');
  });

  it("linkifies in headings, list items and blockquotes", () => {
    const html = renderMarkdown(
      ["# Heading [[API-001]]", "", "- item [[API-001]]", "", "> quote [[API-001]]"].join("\n"),
      KNOWN,
    );
    expect(html).toMatch(/<h1[^>]*>[^<]*<a href="kanmer:API-001"/);
    expect(html).toMatch(/<li>[^<]*<a href="kanmer:API-001"/);
    expect(html).toMatch(/<blockquote>[\s\S]*<a href="kanmer:API-001"/);
    // three anchors, one per context
    expect(html.match(/href="kanmer:API-001"/g)).toHaveLength(3);
  });

  it("leaves a wiki link inside a code span literal", () => {
    const html = renderMarkdown("Reference it as `[[API-001]]` in prose.", KNOWN);
    expect(html).toContain("<code>[[API-001]]</code>");
    expect(html).not.toContain('href="kanmer:');
  });

  it("leaves a wiki link inside a fenced block literal", () => {
    const html = renderMarkdown("```\nsee [[API-001]]\n```", KNOWN);
    expect(html).toContain("<pre>");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain('href="kanmer:');
  });

  it("still escapes body-authored raw HTML", () => {
    const html = renderMarkdown('Hello <img src=x onerror="alert(1)">', KNOWN);
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror=\"alert(1)\">");
  });

  it("escapes an alias containing markup", () => {
    const html = renderMarkdown("See [[API-001|<b>x</b>]].", KNOWN);
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toContain("<b>x</b>");
  });
});
