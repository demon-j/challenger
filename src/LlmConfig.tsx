import React, { useState } from "react";
import { BaseMessage } from "@langchain/core/messages";
import { weatherTool, weatherToolNameToTool } from "./tools/getWeather.ts";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

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

export const LlmConfig = () => {
  const [messages, setMessages] = useState<BaseMessage[]>([]);

  const [programmingLanguage, setProgrammingLanguage] =
    useState<AvailableLanguage>("javascript");
  const [framework, setFramework] = useState<string>("react");

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

  console.log(messages);

  return (
    <div className="flex flex-row gap-2 card bg-base-100 m-4 w-96">
      <div className="flex flex-row">
        <label>Language</label>
        <select
          name=""
          value={programmingLanguage}
          id=""
          className="select select-bordered select-sm"
          onChange={(opt) => {
            setProgrammingLanguage(opt.target.value as AvailableLanguage);
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
      <div className="flex flex-row justify-center align-middle gap-1">
        <label>Framework</label>
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
      <button onClick={run} className="btn btn-primary btn-sm">
        Run
      </button>
    </div>
  );
};
