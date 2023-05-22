## babel-plugin-react-label-sugar

A simple React Label Sugar just for fun :) 😄

online babel [playground](https://babeljs.io/repl#?browsers=defaults%2C%20not%20ie%2011%2C%20not%20ie_mob%2011&build=&builtIns=false&spec=false&loose=false&code_lz=GYVwdgxgLglg9mABAQQA6oBQEpEG8BQiiATgKbABciEc4UiAvIgAwDchiHA7gIZQQALKgBNaAIwA2pYY2q0w9BgD45dRACpEAJnZFufQSPFSZyvByI0wAZzhSAdBLgBzDKJCTpWXYgC-HDjIoEGIkAB4xECgoBEQEAGEJGAgAawZcbEYVGjoAalzfJVwchV8wgHpI6IQlfF8gA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=false&presets=&prettier=true&targets=&version=7.12.3&externalPlugins=babel-plugin-react-label-sugar%400.1.0-alpha.4%2C%40babel%2Fplugin-syntax-jsx%407.12.1)

codesandbox [example](https://codesandbox.io/s/babel-react-label-sugar-example-ifuo2)

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

If you use vite, add this config to vite `react` plugin (swc is not supported)
```js
{
    plugins: [react({ babel: { babelrc: true } })],
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

### Tips

If your program gets stuck while running the following command `value = e.target.value`. This is probably because you are using React 16. This plugin uses function arguments (eg. `setState(() => 1)`) by default when handling data changes, and React 16 loses event references due to its event pool.

React 17, on the other hand, behaves just fine.


### Todo List
- [x] support useImmer, transpile `obj.value = 1` to `setObject(obj => obj.value = 1)`
- [x] more labels, auto generate dependency list.
- [ ] custom labels
