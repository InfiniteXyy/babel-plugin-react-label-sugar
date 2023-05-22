import React from "react";

export default function () {
  ref: list = [
    { name: "vue", star: 0 },
    { name: "react", star: 0 },
    { name: "angular", star: 0 },
  ];

  ref: newItem = "";

  const pushItem = () => {
    list = [...list, { name: newItem, star: 0 }];
    newItem = "";
  };

  return (
    <div>
      <h3>list sample</h3>
      <ul>
        {list.map((item, index) => (
          <li key={item.name} onClick={() => list[index].star++}>
            {item.name} - {item.star}
          </li>
        ))}
      </ul>
      <input value={newItem} onChange={(e) => (newItem = e.target.value)} />
      <button onClick={pushItem}>add</button>
    </div>
  );
}
