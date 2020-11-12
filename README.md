### babel-plugin-react-ref-sugar

```tsx
function App() {
  ref: count = 0;
  return <button onClick={() => count++}>{count}</button>
}
```

will be transpiled to 


```tsx
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count => count + 1)}>{count}</button>
}
```
