import { transformSync } from "@babel/core";
import { expect } from "chai";
import { resolve } from "path";
import { minify } from "terser";

const plugins = [resolve(__dirname, "../lib")];

describe("test react-ref-sugar", () => {
  it("should happy path success", async () => {
    const code = `
    import React, { useState } from 'react';
    function App() {
      ref: count = 20 * 3;
      return React.createElement("button", { onClick: () => count = count + 1 }, count)
    }
    `;

    const actual = await minify(transformSync(code, { plugins })?.code ?? "");

    const expected = await minify(`
    import React, { useState } from 'react';
    function App() {
      const [count, setCount] = useState(20 * 3);
      return React.createElement("button", { onClick: () => setCount(count + 1) }, count)
    }
    `);

    expect(actual.code).to.equal(expected.code);
  });

  it("should import useState automatically", () => {});

  it("should not affect other expressions", () => {});

  it("should handle self update expression correct", () => {});
});
