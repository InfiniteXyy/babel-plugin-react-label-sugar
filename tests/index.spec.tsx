import { transformSync } from "@babel/core";
import { expect } from "chai";
import { minify as _minify } from "terser";
import ReactLabelSugar from "../src";

const minify = async (code?: string | null): Promise<string> => {
  return (await _minify(code ?? "", { format: { beautify: true }, compress: false })).code ?? "";
};

const plugins = [ReactLabelSugar];
const pluginsWithOption = [[ReactLabelSugar, { refLabel: "$", stateFactory: "useImmer", ignoreMemberExpr: false }]];

describe("test react-label-sugar", () => {
  it("should skip other labels", async () => {
    const code = `{label: count = 0;}`;
    const actual = transformSync(code, { plugins })?.code;
    const expected = `{label: count = 0;}`;
    expect(await minify(actual)).to.equal(await minify(expected));
  });

  it("should fail if label body is not expression", () => {
    const code = `ref: if (true) {}`;
    expect(() => transformSync(code, { plugins })).to.throw("ref sugar must be an expression statement");
  });

  describe("ref: unexpected cases", () => {
    it("should fail if ref expr is not an assignment expr", () => {
      const code = `ref: count * 3;`;
      expect(() => transformSync(code, { plugins })).to.throw("ref sugar expression must be an assignment");
    });

    it("should fail if ref expr left is not an identify", () => {
      const code = `ref: [a] = [1]`;
      expect(() => transformSync(code, { plugins })).to.throw("ref sugar assignment left must be an identifier");
    });
  });

  describe("ref: happy path", () => {
    it("should basic usage success", async () => {
      const code = `{ref: count = 0; count = count + 1;}`;
      const actual = transformSync(code, { plugins })?.code;
      const expected = `{const [count, setCount] = React.useState(0); setCount(count => count + 1);}`;
      expect(await minify(actual)).to.equal(await minify(expected));
    });

    it("should handle self update expression correct", async () => {
      const code = `{ref: count = 0; count *= 2; count++;}`;
      const actual = transformSync(code, { plugins })?.code;
      const expected = `{
      const [count, setCount] = React.useState(0);
      setCount(count => count * 2);
      setCount(count => count + 1) 
      }`;
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
      const expected = `
      const [obj, _setObj] = React.useState({ count: 0 });
      obj.count = 2;
      obj.count++;
      `;
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

    it("should ref not affect other scope", async () => {
      const code = `{ ref: count = 0; } { count++; }`;
      const actual = transformSync(code, { plugins })?.code ?? "";
      const expected = `
      { const [count, setCount] = React.useState(0); }
      { count++; }
      `;
      expect(await minify(actual)).to.equal(await minify(expected));
    });

    it("should ref not affect closure", async () => {
      const code = `{
        ref: count = 0;
        {
          let count = 0;
          {
            count = 1;
          }
        }
        count = 1;
      }`;
      const actual = transformSync(code, { plugins })?.code ?? "";
      const expected = `{
        const [count, setCount] = React.useState(0);
        {
          let count = 0;
          {
            count = 1;
          } 
        }
        setCount((count) => 1);
      }`;
      expect(await minify(actual)).to.equal(await minify(expected));
    });
  });

  describe("watch: unexpected cases", () => {
    it("should fail if watch label is not an assignment or function", () => {
      const code = `watch: count * 3`;
      expect(() => transformSync(code, { plugins })).to.throw("watch sugar must be an assignment or arrow function");
    });

    it("should fail if watch expr (assign mode) right is not a function", () => {
      const error = "watch sugar assign right must be an arrow function";
      const code = `watch: a = 2;`;
      const code2 = `watch: a = function() { return 1 };`;
      expect(() => transformSync(code, { plugins })).to.throw(error);
      expect(() => transformSync(code2, { plugins })).to.throw(error);
    });

    it("should fail if watch expr (assign mode) left is not a identify", () => {
      const code = `watch: [a] = () => 2;`;
      expect(() => transformSync(code, { plugins })).to.throw("watch sugar assign left must be an identify");
    });

    it("should fail if watch arrow function left contains something other than identify", () => {
      const error = "watch sugar arrow deps can only be identify";
      const code = `watch: a = (q = 1) => 2;`;
      const code2 = `watch: b = ({ a }) => 2;`;
      const code3 = `watch: c = ([a]) => 2;`;
      const code4 = `watch: ([a]) => 2;`;
      expect(() => transformSync(code, { plugins })).to.throw(error);
      expect(() => transformSync(code2, { plugins })).to.throw(error);
      expect(() => transformSync(code3, { plugins })).to.throw(error);
      expect(() => transformSync(code4, { plugins })).to.throw(error);
    });
  });

  describe("watch: happy path", () => {
    it("should useEffect basic usage success", async () => {
      const code = `{watch: (count) => console.log(count)}`;
      const actual = transformSync(code, { plugins })?.code;
      const expected = `{React.useEffect(() => console.log(count), [count])}`;
      expect(await minify(actual)).to.equal(await minify(expected));
    });

    it("should useMemo basic usage success", async () => {
      const code = `{watch: doubled = count => count * 2}`;
      const actual = transformSync(code, { plugins })?.code;
      const expected = `{const doubled = React.useMemo(() => count * 2, [count])}`;
      expect(await minify(actual)).to.equal(await minify(expected));
    });
  });
});
