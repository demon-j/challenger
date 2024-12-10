import "./App.css";
import "@xterm/xterm/css/xterm.css";
import { CodeSandbox } from "./CodeSandbox.tsx";
import { LlmConfig } from "./LlmConfig.tsx";

function App() {
  return (
    <>
      <LlmConfig />
      <CodeSandbox />
    </>
  );
}

export default App;
