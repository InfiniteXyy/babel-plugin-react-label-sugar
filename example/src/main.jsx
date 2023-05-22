import ReactDOM from "react-dom/client";
import CalculatorExample from "./CalculatorExample";
import ListExample from "./ListExample";
import ObjectExample from "./ObjectExample";

function App() {
  return (
    <div>
      <ObjectExample />
      <CalculatorExample />
      <ListExample />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
