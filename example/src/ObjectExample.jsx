import React from "react";

export default function () {
  ref: obj = { name: "xyy", age: 12 };
  return (
    <div>
      <h3>Object Example</h3>
      <input onChange={(e) => (obj.name = e.target.value)} value={obj.name} />
      <button onClick={() => obj.age++}>grow</button>
      <b>{JSON.stringify(obj)}</b>
    </div>
  );
}
