import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TaskItem, ReminderStyle } from "../types";

const parseGeminiResponse = (responseText: string): any => {
  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", e);
    throw new Error("Could not understand the AI plan format.");
  }
};

const getTaskSchema = (): Schema => ({
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "A unique short id like 'task_1'" },
      title: { type: Type.STRING, description: "Short, actionable title for the calendar event" },
      description: { type: Type.STRING, description: "Detailed instructions for this specific step" },
      dayOffset: { type: Type.INTEGER, description: "Number of days from today to schedule this. 0 is today, 1 is tomorrow." },
      startTime: { type: Type.STRING, description: "Suggested start time in HH:MM (24h) format. Be realistic." },
      durationMinutes: { type: Type.INTEGER, description: "Estimated duration in minutes" },
      reminderStyle: { 
        type: Type.STRING, 
        enum: ['ALARM', 'VIBRATE', 'NONE'],
        description: "Notification style. Use ALARM for urgent/wake-up/deadlines, VIBRATE for important tasks, NONE for casual tasks." 
      }
    },
    required: ["id", "title", "description", "dayOffset", "startTime", "durationMinutes", "reminderStyle"],
  },
});

const getClaritySchema = (): Schema => ({
  type: Type.OBJECT,
  properties: {
    isSufficient: { type: Type.BOOLEAN, description: "True if the goal has enough detail (duration, frequency, specific outcome) to build a schedule. False if vague." },
    clarifyingQuestion: { type: Type.STRING, description: "A single, friendly, concise question to ask the user for missing details. Null if sufficient." }
  },
  required: ["isSufficient"]
});

export const checkGoalClarity = async (goal: string): Promise<{ isSufficient: boolean; clarifyingQuestion?: string }> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    You are a helpful productivity coach. The user wants a plan for: "${goal}".
    
    YOUR TASK:
    Analyze if this goal contains enough information to build a concrete schedule.
    
    CRITERIA FOR "SUFFICIENT":
    1. Does it have a specific outcome? (e.g. "Run 5k", "Finish report", "Clean house")
    2. Does it have a rough timeline OR frequency? (e.g. "in 1 month", "daily", "by Friday", "this weekend")
    
    IMPORTANT ANALYSIS RULES:
    - If the user specifies a TIME (e.g., "in 2 weeks", "tomorrow"), DO NOT ask for a timeline.
    - If the user specifies a FREQUENCY (e.g., "daily", "3 times a week"), DO NOT ask for frequency.
    - If the goal is simple and implies a short term (e.g., "Clean the garage", "Pack for trip"), assume "As soon as possible" and mark it as SUFFICIENT. Do not nag the user.
    - Only ask if the goal is extremely vague (e.g., "Get fit", "Learn a language", "Write a book") with NO timeline.
    
    OUTPUT:
    - If sufficient: set isSufficient = true.
    - If vague: set isSufficient = false and write ONE concise clarifying question (e.g., "When do you want to achieve this by?", "How many days a week can you commit?").
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getClaritySchema(),
        temperature: 0.7,
      },
    });

    if (response.text) {
      return parseGeminiResponse(response.text);
    }
    return { isSufficient: true };
  } catch (error) {
    console.error("Clarity Check Error:", error);
    return { isSufficient: true }; // Fail safe to proceed
  }
};

export const decomposeGoal = async (
  goal: string, 
  constraints?: string, 
  forceReminderStyle?: ReminderStyle,
  existingSchedule?: string
): Promise<TaskItem[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let prompt = `
    I have a goal: "${goal}".
    
    Please break this down into a concrete, step-by-step plan. 
    Act as an expert project manager and productivity coach.
    
    Rules:
    1. Break the goal down into logical, chronological steps.
    2. Assign a realistic 'dayOffset' for each step starting from today (0).
    3. Assign a specific 'startTime' (e.g. "09:00", "14:30") for when the user should do this.
    4. Keep descriptions motivating but concise.
    5. Ensure the output is strictly valid JSON matching the schema.
  `;

  if (existingSchedule) {
    prompt += `
    
    EXISTING SCHEDULE (AVOID CONFLICTS):
    The user is busy at the following times (Day 0 = Today). 
    Do NOT schedule new tasks that overlap with these times.
    ${existingSchedule}
    `;
  }

  if (forceReminderStyle) {
     prompt += `
     6. IMPORTANT: You must set the 'reminderStyle' for ALL tasks to '${forceReminderStyle}'.
     `;
  } else {
     prompt += `
     6. For 'reminderStyle', intelligently decide based on the task:
        - 'ALARM': High priority, time-sensitive (e.g., wake up, meetings, medications).
        - 'VIBRATE': Medium priority (e.g., workouts, study sessions).
        - 'NONE': Low priority or flexible tasks.
     `;
  }

  if (constraints) {
    prompt += `
    
    IMPORTANT USER CONSTRAINTS / CONTEXT (Follow these strictly):
    ${constraints}
    `;
  } else {
    prompt += `
    
    7. If the goal is large, spread it out over multiple days reasonably.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getTaskSchema(),
        temperature: 0.7,
      },
    });

    if (response.text) {
      return parseGeminiResponse(response.text);
    }
    throw new Error("No response text generated.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const modifyPlan = async (currentTasks: TaskItem[], instruction: string, currentDayOffset: number = 0): Promise<TaskItem[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Separate tasks to protect completed ones
  const completedTasks = currentTasks.filter(t => t.isCompleted);
  const activeTasks = currentTasks.filter(t => !t.isCompleted);

  const prompt = `
    I am managing a project plan. The user wants to modify the UPCOMING/ACTIVE tasks.

    TIMELINE CONTEXT:
    - The plan started on "Day 0".
    - Today is "Day ${currentDayOffset}".
    - When the user says "today", they mean dayOffset = ${currentDayOffset}.
    - When the user says "tomorrow", they mean dayOffset = ${currentDayOffset + 1}.

    CONTEXT (COMPLETED TASKS - READ ONLY):
    These tasks are already finished. DO NOT output them, modify them, or delete them. Just use them as context.
    ${JSON.stringify(completedTasks)}

    ACTIVE TASKS (EDITABLE):
    These are the tasks you can modify, delete, or add to.
    ${JSON.stringify(activeTasks)}

    USER INSTRUCTION:
    "${instruction}"

    Please regenerate the list of *ACTIVE* tasks adhering to the user's request.
    
    Rules:
    1. OUTPUT ONLY the list of active/upcoming tasks. Do NOT include the completed tasks in the JSON output.
    2. You can ADD NEW TASKS (use unique IDs), DELETE tasks, or MODIFY existing tasks.
    3. If adding a task for specific day, calculate the correct dayOffset based on the "Today is Day ${currentDayOffset}" context.
    4. Maintain the JSON structure strictly.
    5. Preserve 'reminderStyle' unless the user asks to change the notification settings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getTaskSchema(),
        temperature: 0.7,
      },
    });

    if (response.text) {
      const newActiveTasks = parseGeminiResponse(response.text);
      // Recombine: Keep original completed tasks untouched + new version of active tasks
      return [...completedTasks, ...newActiveTasks];
    }
    throw new Error("No response text generated.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};