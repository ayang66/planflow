import { TaskItem, ReminderStyle } from "../types";

const DEEPSEEK_API_KEY = "sk-480997ccc5644e0186040f93970e9117";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";

const parseResponse = (responseText: string): any => {
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    throw new Error("Could not understand the AI plan format.");
  }
};

const callDeepSeek = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const response = await fetch(DEEPSEEK_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("DeepSeek API Error:", error);
    throw new Error(`DeepSeek API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
};

export const checkGoalClarity = async (goal: string): Promise<{ isSufficient: boolean; clarifyingQuestion?: string }> => {
  const systemPrompt = `You are a helpful productivity coach. Analyze if a goal has enough detail to build a schedule.
Output ONLY valid JSON in this format: {"isSufficient": boolean, "clarifyingQuestion": "string or null"}`;

  const userPrompt = `
The user wants a plan for: "${goal}".

CRITERIA FOR "SUFFICIENT":
1. Does it have a specific outcome? (e.g. "Run 5k", "Finish report", "Clean house")
2. Does it have a rough timeline OR frequency? (e.g. "in 1 month", "daily", "by Friday")

RULES:
- If the user specifies a TIME (e.g., "in 2 weeks", "tomorrow"), DO NOT ask for a timeline.
- If the user specifies a FREQUENCY (e.g., "daily", "3 times a week"), DO NOT ask for frequency.
- If the goal is simple and implies short term (e.g., "Clean the garage"), assume "ASAP" and mark SUFFICIENT.
- Only ask if extremely vague (e.g., "Get fit", "Learn a language") with NO timeline.

OUTPUT JSON:
- If sufficient: {"isSufficient": true}
- If vague: {"isSufficient": false, "clarifyingQuestion": "Your concise question here"}
`;

  try {
    const response = await callDeepSeek(systemPrompt, userPrompt);
    return parseResponse(response);
  } catch (error) {
    console.error("Clarity Check Error:", error);
    return { isSufficient: true };
  }
};
