import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeEventText(text: string): Promise<{
  suggestedTitle: string;
  suggestedTime: { start: string; end: string };
  category: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Analyze the event text and extract event details. Return a JSON object with suggestedTitle, suggestedTime (start and end in ISO format), and category."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    throw new Error("Failed to analyze event text: " + error.message);
  }
}

export async function suggestEvents(
  existingEvents: any[],
  preferences: any
): Promise<any[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Based on existing events and preferences, suggest new events. Return an array of event objects with title, start time, end time, and category."
        },
        {
          role: "user",
          content: JSON.stringify({ events: existingEvents, preferences })
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content).suggestions;
  } catch (error) {
    throw new Error("Failed to generate event suggestions: " + error.message);
  }
}
