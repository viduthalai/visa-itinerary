import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static SVG assets must parse as XML.
 *
 * WHY THIS EXISTS. app/icon.svg was shipped with a documentation comment that
 * contained a CSS custom property name. A double hyphen is illegal inside an XML
 * comment, so the file was a parse error and the icon rendered nothing at all.
 *
 * Every existing check stayed green through that: `tsc --noEmit` does not look at
 * SVG, `next build` copies the file without parsing it, the test suite never opened
 * it, and `curl` returned 200 with `image/svg+xml` because the server is happy to
 * serve bytes it does not validate. The break was only visible by rendering the file
 * in a browser and reading the parser's error page.
 *
 * A status code is not a parse. This test is the parse.
 */

/** Files served directly to the browser as SVG, so the browser is the XML parser. */
const SVG_DIRS = ["app", "public"];

function findSvgs(): string[] {
  const out: string[] = [];
  for (const dir of SVG_DIRS) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue; // public/ may not exist
    }
    for (const f of entries) {
      if (f.endsWith(".svg")) out.push(join(dir, f));
    }
  }
  return out;
}

const svgs = findSvgs();

describe("static SVG assets", () => {
  it("finds the icon, so the suite cannot pass by scanning nothing", () => {
    expect(svgs).toContain(join("app", "icon.svg"));
  });

  for (const path of svgs) {
    describe(path, () => {
      const source = readFileSync(path, "utf8");

      /*
       * The specific bug: `--` inside a comment. Checked directly rather than only
       * via a parser, because the message a parser gives ("Double hyphen within
       * comment") is far less useful than naming the rule at the failure site.
       */
      it("has no double hyphen inside an XML comment", () => {
        const comments = [...source.matchAll(/<!--([\s\S]*?)-->/g)];
        for (const [, body] of comments) {
          expect(
            body.includes("--"),
            `An XML comment in ${path} contains "--", which is a parse error. ` +
              `CSS custom property names cannot be written in an SVG comment.`,
          ).toBe(false);
        }
      });

      /*
       * A full parse, so any other malformation is caught too: unclosed tags, a
       * stray ampersand, a bad attribute quote. DOMParser reports XML errors as a
       * `parsererror` element rather than throwing, which is why this asserts on the
       * document contents instead of wrapping in try/catch.
       */
      it("parses as XML and has an <svg> root", () => {
        const doc = new DOMParser().parseFromString(source, "image/svg+xml");
        const err = doc.querySelector("parsererror");
        expect(err?.textContent ?? null, `XML parse error in ${path}`).toBeNull();
        expect(doc.documentElement.tagName.toLowerCase()).toBe("svg");
      });

      /*
       * An SVG with no viewBox cannot be scaled by the browser, which for a favicon
       * asked for at 16px, 32px and 180px means it renders at whatever intrinsic
       * size it happens to have.
       */
      it("declares a viewBox", () => {
        const doc = new DOMParser().parseFromString(source, "image/svg+xml");
        expect(doc.documentElement.getAttribute("viewBox")).toMatch(/^[\d.\s-]+$/);
      });

      /* Something has to actually be drawn. A tile with no glyph still parses. */
      it("draws at least one shape", () => {
        const doc = new DOMParser().parseFromString(source, "image/svg+xml");
        const shapes = doc.querySelectorAll("path, rect, circle, ellipse, polygon, polyline, line");
        expect(shapes.length).toBeGreaterThan(0);
      });
    });
  }
});
