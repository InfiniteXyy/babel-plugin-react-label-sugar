## babel-plugin-react-label-sugar

A simple `React.useState` sugar based on js label

### Quick Start
1⃣️ install
```
npm install --save-dev babel-plugin-react-label-sugar
```

2⃣️ add plugin in .babelrc
```json
{
  "plugins": ["babel-plugin-react-label-sugar"]
}
```

3⃣️ (optional) custom options
```json5
{ 
    "refLabel": "$", // default is "ref"
    "refFactory": "useState", // default is "React.useState"
    "ignoreMemberExpr": false, // default is true, see "with immer" below for more info
}
```

### Examples

```ts
// before
ref: count = 0;
count = count * 2;
count++;
count *= 3;
// after
const [count, setCount] = useState(0)
setCount(count * 2);
setCount(count => count + 1);
setCount(count => count * 3);
```

### Q&A

Q: Can I use it to declare object state like we did in `Vue ref`?

A: No, this plugin doesn't do anything on your code, but transpile the label expression to useState function call.

```tsx
// so you must use it like this
$: student = { name: "xyy" };

<input onChange={e => student = { ...student, name: e.target.value }}></input>
```

_**Work with immer**_

1⃣️ set `ignoreMemberExpr` to be `true` in `.babelrc`

2⃣️ set `refFactory` to be `useImmer` in `.babelrc`

3⃣️ install and import `useImmer` in your code

```jsx
// before
ref: obj = { count: 0 }
obj.count++;

// after
const [obj, setObj] = useImmer({ count: 0 });
setObj((obj) => { obj.count++ });
```

### Todo List
- [x] support useImmer, transpile `obj.value = 1` to `setObject(obj => obj.value = 1)`

### But why?

just for fun :) 😄
