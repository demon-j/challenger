import { useEffect, useRef, useState } from "react";
import "./App.css";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { weatherTool, weatherToolNameToTool } from "./tools/getWeather.ts";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

const files = {
  "index.js": {
    file: {
      contents: `
import express from 'express';
const app = express();
const port = 3111;

app.get('/', (req, res) => {
  res.send('Welcome to a WebContainers app! 🥳');
});

app.listen(port, () => {
  console.log(\`App is live at http://localhost:\${port}\`);
});`,
    },
  },
  "package.json": {
    file: {
      contents: `
{
  "name": "example-app",
  "type": "module",
  "dependencies": {
    "express": "latest",
    "nodemon": "latest"
  },
  "scripts": {
    "start": "nodemon --watch './' index.js"
  }
}`,
    },
  },
};
// Call only once
const webcontainerInstance = await WebContainer.boot();
await webcontainerInstance.mount(files);

const availableLanguages = [
  "javascript",
  "typescript",
  "php",
  "python",
  "ruby",
  "java",
  "csharp",
] as const;

type AvailableLanguage = (typeof availableLanguages)[number];

const frameworks = {
  javascript: ["nodejs", "react", "angular", "vue"],
  typescript: ["nodejs", "react", "angular", "vue"],
  php: ["laravel", "symfony", "wordpress"],
} satisfies { [K in AvailableLanguage]?: string[] };

const allTools = [weatherTool];

const toolsByName = {
  ...weatherToolNameToTool,
} satisfies Record<string, (typeof allTools)[number]>;

const prompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `
    You're a very experienced {language} engineer. Your task today is to create code for an interview challenge, 
    you will receive clear instructions and hints to help you along the way.
    The code generated shouldn't be perfect, have 2-3 bugs, contain few tests and some instructions.
    Make sure that the response is in JSON format.
    Hint: You can use the tools provided to help you with the task.
    Guide: JSON should have the following properties:
    - result: The result of the code. Required.
    - result[number].language: The programming language used. Required.
    - result[number].params: The parameters used in the code. Optional.
    - result[number].code: The code that you created to achieve the requirements. Required.
    - result[number].description: A description of the code. Required.
    - result[number].fileName: The name of the file
    Rule: Do not generate any code if you were not requested to do so.
    Guide: Make sure to create all the files needed to execute the code, for example if you generate code for React 
    with typescript, you should add the package.json, tsconfig.json, and all the folders, etc.
    `,
  ),
  HumanMessagePromptTemplate.fromTemplate(
    "Create a tic tac toe game using {framework}, build it from scratch and create as many files as needed.",
  ),
]);

const llm = new ChatOpenAI({
  model: "gpt-4o", // Default value
  apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,

  // other params...
}).bindTools(allTools, {
  strict: true,
  response_format: { type: "json_object" },
});

const chain = prompt.pipe(llm);

function App() {
  const [messages, setMessages] = useState<BaseMessage[]>([]);
  const [installationComplete, setInstallationComplete] = useState(false);
  const [programmingLanguage, setProgrammingLanguage] =
    useState<AvailableLanguage>("javascript");
  const [framework, setFramework] = useState<string>("react");
  const [code, setCode] = useState<string>(files["index.js"].file.contents);
  const [webContainerURL, setWebContainerURL] =
    useState<string>("loading.html");
  const [terminal, setTerminal] = useState<Terminal | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);

  const run = async () => {
    const localMessages = [...messages];
    const response = await chain.invoke({
      language: programmingLanguage,
      framework,
    });
    localMessages.push(response);

    for (const toolCallArgs of response.tool_calls) {
      if (toolsByName[toolCallArgs.name]) {
        const currentTool = toolsByName[toolCallArgs.name];
        const toolMessage = await currentTool.invoke(toolCallArgs);
        localMessages.push(toolMessage);
      }
    }

    setMessages(localMessages);
  };

  // Attach the terminal element to the terminal object and install deps
  useEffect(() => {
    if (terminalRef.current) {
      const terminal = new Terminal({
        convertEol: true,
      });
      terminal.open(terminalRef.current);
      setTerminal(terminal);

      (async () => {
        const installProcess = await webcontainerInstance.spawn("npm", [
          "install",
        ]);

        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
            },
          }),
        );
        if ((await installProcess.exit) !== 0) {
          throw new Error("Installation failed");
        }
        setInstallationComplete(true);
      })();
    }
  }, [terminalRef]);

  const startWebServer = async () => {
    const serverProcess = await webcontainerInstance.spawn("npm", [
      "run",
      "start",
    ]);
    console.log("Server is running");

    if (terminal) {
      serverProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        }),
      );
    }

    webcontainerInstance.on("server-ready", (port, url) => {
      console.log(url);
      setWebContainerURL(url);
    });
  };

  const writeIndexJS = async (content) => {
    await webcontainerInstance.fs.writeFile("/index.js", content);
    setCode(content);
  };

  return (
    <>
      <div className="flex flex-col gap-2 card bg-base-100 m-4 w-96">
        <div>
          Language
          <select
            name=""
            value={programmingLanguage}
            id=""
            className="select select-bordered select-sm"
            onChange={(opt) => {
              setProgrammingLanguage(opt.target.value);
              setFramework("");
            }}
          >
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
        <div>
          Framework
          <select
            name=""
            id=""
            value={framework}
            className="select select-bordered select-sm"
            onChange={(opt) => setFramework(opt.target.value)}
          >
            <option value=""></option>
            {frameworks[programmingLanguage].map((framework) => (
              <option key={framework} value={framework}>
                {framework}
              </option>
            ))}
          </select>
        </div>
        <button onClick={run} className="btn btn-primary">
          Run
        </button>
      </div>

      {messages.map((message, idx) => {
        return (
          <div key={idx}>
            <pre>{message.content}</pre>
            {/*<pre>{JSON.stringify(message, null, 4)}</pre>*/}
          </div>
        );
      })}
      <button
        className="btn btn-accent"
        disabled={!installationComplete}
        onClick={async () => {
          startWebServer();
        }}
      >
        Execute
      </button>

      <div className="flex flex-row h-96">
        <textarea
          name=""
          id=""
          value={code}
          onChange={(e) => writeIndexJS(e.target.value)}
          className="textarea textarea-bordered textarea-lg w-1/2"
        />

        <div className="mockup-browser bg-base-300 border w-1/2">
          <div className="mockup-browser-toolbar">
            <div className="input">{webContainerURL}</div>
          </div>
          <div className="bg-base-200">
            <iframe src={webContainerURL} className="w-full h-full" />
          </div>
        </div>
      </div>

      <div>
        <div ref={terminalRef}></div>
      </div>
    </>
  );
}

export default App;
