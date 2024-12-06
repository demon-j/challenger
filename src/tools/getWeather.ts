import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const weatherTool = tool(
  ({ location }) => {
    console.log(`calling ${location}`);
    return `25C and sunny in ${location}`;
  },
  {
    name: "getWeather",
    description: "Provides the weather for a specific location.",
    schema: z.object({
      location: z
        .string()
        .describe("The location for which to get the weather."),
    }),
  },
);

export const weatherToolNameToTool = {
  getWeather: weatherTool,
};
