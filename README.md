## babel-plugin-react-label-sugar

A simple React Label Sugar just for fun :) 😄

### Quick Start
```sh
# install
npm install --save-dev babel-plugin-react-label-sugar
```

Add plugin in .babelrc
```json
{
  "plugins": ["babel-plugin-react-label-sugar"]
}
```

(optional) custom options
```json5
{ 
  "refLabel": "$",              // default is "ref"
  "watchLabel": "on",           // default is "watch"
  "stateFactory": "useState",   // default is "React.useState"
  "memoFactory": "useMemo",     // default is "React.useMemo"
  "effectFactory": "useEffect", // default is "React.useEffect"
  "ignoreMemberExpr": false,    // default is true, will skip object value mutation
}
```

### Examples

```ts
// before
ref: count = 0;
watch: doubled = count => count * 2
watch: count => console.log(count)

count++;
count = 10;
// after
const [count, setCount] = useState(0);
const doubled = useMemo(() => count * 2, [count]);
useEffect(() => {
  console.log(count);
}, [count])

setCount(count => count + 1);
setCount(count => 10);
```

### Q&A

Q: Can I use it to declare objects like `Vue ref`?

A: No, this plugin doesn't do anything on your code, but transpile the label expression to useState function call.

```tsx
// so you must use it like this
$: student = { name: "xyy" };

<input onChange={e => student = { ...student, name: e.target.value }}></input>
```

But you can use immer to achieve this

Set .babelrc `{ "ignoreMemberExpr": false, "stateFactory": "useImmer" }`

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
- [x] more labels, auto generate dependency list.
```ts
ref: count = 1;
// useMemo
watch: doubled = (count) => count * 2;
// useEffect
watch: (doubled) => {
  console.log(doubled);
}
```
