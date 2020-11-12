import { transformSync } from "@babel/core";
import { expect } from "chai";
import { minify } from "terser";
import ReactLabelSugar from "../src";

const plugins = [ReactLabelSugar];
const pluginsWithOption = [
  [ReactLabelSugar, { RefLabel: "$", RefFactory: "useState" }]
];

describe("test react-label-sugar", () => {
  describe("unexpected cases", () => {
    it("should fail if ref label is not an expression", () => {
      const code = `ref: if (true) {}`;
      expect(() => transformSync(code, { plugins })).to.throw(
        "ref sugar must be an expression statement"
      );
    });

    it("should fail if ref expr is not an assignment expr", () => {
      const code = `ref: count * 3;`;
      expect(() => transformSync(code, { plugins })).to.throw(
        "ref sugar expression must be an assignment"
      );
    });

    it("should fail if ref expr left is not an identify", () => {
      const code = `ref: [a] = [1]`;
      expect(() => transformSync(code, { plugins })).to.throw(
        "ref sugar assignment left must be an identifier"
      );
    });
  });

  describe("happy path", () => {
    it("should happy path success", async () => {
      const code = `
      function App() {
        ref: count = 20 * 3;
        return React.createElement("button", { onClick: () => count = count + 1 }, count)
      }
    `;

      const actual = await minify(transformSync(code, { plugins })?.code ?? "");

      const expected = await minify(`
      function App() {
        const [count, setCount] = React.useState(20 * 3);
        return React.createElement("button", { onClick: () => setCount(count + 1) }, count)
      }
    `);

      expect(actual.code).to.equal(expected.code);
    });

    it("should generate correct modifier name when conflict", async () => {
      const code = `
      function App() {
        const setCount = () => {};
        const setCount2 = () => {};
        const _setCount2 = () => {};
        ref: count = 0;
        ref: count2 = 1;
        return React.createElement("button", { onClick: () => { count = 1; count2 = 2; } });
      }
    `;

      const actual = await minify(transformSync(code, { plugins })?.code ?? "");

      const expected = await minify(`
      function App() {
        const setCount = () => {};
        const setCount2 = () => {};
        const _setCount2 = () => {};
        const [count, _setCount] = React.useState(0);
        const [count2, _setCount3] = React.useState(1);
        return React.createElement("button", { onClick: () => { _setCount(1); _setCount3(2); } });
      }
    `);

      expect(actual.code).to.equal(expected.code);
    });

    it("should not affect other expressions", async () => {
      const code = `
      function App() {
        ref: count = 0;
        let other = 1;
        return React.createElement("button", { onClick: () => { count = 1; other = 1; } });
      }
    `;

      const actual = await minify(transformSync(code, { plugins })?.code ?? "");

      const expected = await minify(`
      function App() {
        const [count, setCount] = React.useState(0);
        let other = 1;
        return React.createElement("button", { onClick: () => { setCount(1); other = 1; } });
      }
    `);

      expect(actual.code).to.equal(expected.code);
    });

    it("should handle self update expression correct", async () => {
      const code = `
      function App() {
        ref: count = 0;
        ref: count2 = 0;
        return React.createElement("button", { onClick: () => { count *= 2; count2++; } });
      }
    `;

      const actual = await minify(transformSync(code, { plugins })?.code ?? "");

      const expected = await minify(`
      function App() {
        const [count, setCount] = React.useState(0);
        const [count2, setCount2] = React.useState(0);
        return React.createElement("button", { onClick: () => { setCount(count => count * 2); setCount2(count => count + 1) } });
      }
    `);

      expect(actual.code).to.equal(expected.code);
    });

    it("should custom label works", () => {
      const code = `$: count = 0;`;

      const actual =
        transformSync(code, { plugins: pluginsWithOption })?.code ?? "";

      const expected = `const [count, _setCount] = useState(0);`;

      expect(actual).to.equal(expected);
    });
  });
});
