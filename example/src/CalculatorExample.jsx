import React from "react";

export default function () {
  ref: a = 3;
  ref: b = 5;
  watch: result = (a, b) => `${a} * ${b} = ${a * b}`;
  watch: (result) => console.log(result);

  return (
    <div>
      <h3>Calculator Example</h3>
      <input type="number" value={a} onChange={(e) => (a = e.target.valueAsNumber)} />
      <input type="number" value={b} onChange={(e) => (b = e.target.valueAsNumber)} />
      <p>{result}</p>
    </div>
  );
}
