## babel-plugin-react-ref-sugar

#### Quick Start
install
```
npm install --save-dev babel-plugin-react-ref-sugar
```

.babelrc
```json
{
  "plugins": ["babel-plugin-react-ref-sugar"]
}
```

default options:
```json
{ "RefLabel": "ref", "RefFactory": "React.useState" }
```

#### Examples

**Basic**

```ts
() => {
  ref: count = 0;
  // ...
  count = count * 2;
}

// will be transpiled to 

() => {
  const [count, setCount] = useState(0)
  // ...
  setCount(count * 2)
}
```

**Self update**

```ts
() => {
  ref: count = 0;
  // ...
  count++;
}

// will be transpiled to 

() => {
  const [count, setCount] = useState(0)
  // ...
  setCount(count => count + 1)
}
```

**When name conflict**

```ts
() => {
  const setCount = () => {};
  ref: count = 0;
  // ...
  count++;
}

// will be transpiled to 

() => {
  const setCount = () => {};
  const [count, _setCount] = useState(0)
  // ...
  _setCount(count => count + 1)
}
```

#### But why?

just for fun :/
