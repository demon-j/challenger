import { useState } from "react";
import "./App.css";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { weatherTool, weatherToolNameToTool } from "./tools/getWeather.ts";

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

const allTools = [weatherTool];

const toolsByName = {
  ...weatherToolNameToTool,
} satisfies Record<string, (typeof allTools)[number]>;

const prompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `
    You're a very experienced {language} engineer. Your task today is create code, 
    you will receive clear instructions and hints to help you along the way. 
    Make sure that the response is in JSON format.
    Hint: You can use the tools provided to help you with the task.
    Guide: JSON should have the following properties:
    - language: The programming language used. Required.
    - params: The parameters used in the code. Optional.
    - code: The code that you created. Required.
    - description: A description of the code. Required.
    `,
  ),
  HumanMessagePromptTemplate.fromTemplate("Create a fizzbuzz function."),
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
  const [programmingLanguage, setProgrammingLanguage] =
    useState<AvailableLanguage>("javascript");

  const run = async () => {
    const localMessages = [...messages];
    const response = await chain.invoke({ language: programmingLanguage });
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

  return (
    <>
      <select
        name=""
        value={programmingLanguage}
        id=""
        onChange={(opt) => setProgrammingLanguage(opt.target.value)}
      >
        {availableLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <button onClick={run}>Run</button>
      {messages.map((message, idx) => {
        return (
          <div key={idx}>
            <pre>{message.content}</pre>
            {/*<pre>{JSON.stringify(message, null, 4)}</pre>*/}
          </div>
        );
      })}
    </>
  );
}

export default App;
