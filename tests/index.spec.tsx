import { transformSync } from "@babel/core";
import { expect } from "chai";
import { minify as _minify } from "terser";
import ReactLabelSugar from "../src";

const minify = async (code?: string | null): Promise<string> => {
  return (await _minify(code ?? "")).code ?? "";
};

const plugins = [ReactLabelSugar];
const pluginsWithOption = [[ReactLabelSugar, { refLabel: "$", refFactory: "useImmer", ignoreMemberExpr: false }]];

describe("test react-label-sugar", () => {
  describe("unexpected cases", () => {
    it("should fail if ref label is not an expression", () => {
      const code = `ref: if (true) {}`;
      expect(() => transformSync(code, { plugins })).to.throw("ref sugar must be an expression statement");
    });

    it("should fail if ref expr is not an assignment expr", () => {
      const code = `ref: count * 3;`;
      expect(() => transformSync(code, { plugins })).to.throw("ref sugar expression must be an assignment");
    });

    it("should fail if ref expr left is not an identify", () => {
      const code = `ref: [a] = [1]`;
      expect(() => transformSync(code, { plugins })).to.throw("ref sugar assignment left must be an identifier");
    });
  });

  describe("happy path", () => {
    it("should happy path success", async () => {
      const code = `
      function App() {
        ref: count = 20 * 3;
        return () => count = count + 1
      }
    `;
      const actual = transformSync(code, { plugins })?.code;
      const expected = `
      function App() {
        const [count, setCount] = React.useState(20 * 3);
        return () => setCount(count => count + 1)
      }
    `;
      expect(await minify(actual)).to.equal(await minify(expected));
    });

    it("should generate correct modifier name when conflict", async () => {
      const code = `
      function App() {
        const setCount = () => {};
        const setCount2 = () => {};
        const _setCount2 = () => {};
        ref: count = 0;
        ref: count2 = 1;
        return () => { count = 1; count2 = 2; };
      }
    `;
      const actual = transformSync(code, { plugins })?.code;
      const expected = `
      function App() {
        const setCount = () => {};
        const setCount2 = () => {};
        const _setCount2 = () => {};
        const [count, _setCount] = React.useState(0);
        const [count2, _setCount3] = React.useState(1);
        return () => { _setCount((count) => 1); _setCount3((count) => 2); };
      }
    `;
      expect(await minify(actual)).to.equal(await minify(expected));
    });

    it("should not affect other expressions", async () => {
      const code = `
      function App() {
        ref: count = 0;
        let other = 1;
        return () => { count = 1; other = 1; };
      }
    `;
      const actual = transformSync(code, { plugins })?.code;
      const expected = await minify(`
      function App() {
        const [count, setCount] = React.useState(0);
        let other = 1;
        return () => { setCount((count) => 1); other = 1; };
      }
    `);
      expect(await minify(actual)).to.equal(await minify(expected));
    });

    it("should handle self update expression correct", async () => {
      const code = `
      function App() {
        ref: count = 0;
        ref: count2 = 0;
        return () => { count *= 2; count2++; };
      }
    `;
      const actual = transformSync(code, { plugins })?.code;
      const expected = `
      function App() {
        const [count, setCount] = React.useState(0);
        const [count2, setCount2] = React.useState(0);
        return () => { setCount(count => count * 2); setCount2(count => count + 1) };
      }
    `;
      expect(await minify(actual)).to.equal(await minify(expected));
    });

    it("should custom label works", () => {
      const code = `$: count = 0;`;
      const actual = transformSync(code, { plugins: pluginsWithOption })?.code ?? "";
      const expected = `const [count, _setCount] = useImmer(0);`;
      expect(actual).to.equal(expected);
    });

    it("should ignore member expression at default", async () => {
      const code = `ref: obj = { count: 0 }; obj.count = 2; obj.count++;`;
      const actual = transformSync(code, { plugins })?.code ?? "";
      const expected = `const [obj, _setObj] = React.useState({ count: 0 });obj.count = 2;obj.count++;`;
      expect(await minify(actual)).to.equal(await minify(expected));
    });

    it("should member expression works", async () => {
      const code = `$: obj = { count: 0, foo: { bar: 1 } }; obj.count = 2; obj.count++; obj.foo.bar = 2;`;
      const actual = transformSync(code, { plugins: pluginsWithOption })?.code ?? "";
      const expected = `
      const [obj, _setObj] = useImmer({ count: 0, foo: { bar: 1 } });
      _setObj(obj => {
        obj.count = 2;
      });
      _setObj(obj => {
        obj.count++;
      });
      _setObj(obj => {
        obj.foo.bar = 2;
      });
      `;
      expect(await minify(actual)).to.equal(await minify(expected));
    });
  });
});
