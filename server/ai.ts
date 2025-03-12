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
    console.error("Failed to analyze event text:", error);
    throw new Error("Failed to analyze event text");
  }
}

export async function parseMultipleEvents(text: string): Promise<Array<{
  title: string;
  start: string;
  end: string;
  category?: string;
}>> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Parse multiple events from a semicolon-separated list. Each event should have a title and time range.
            Convert time formats (like "5:50-5:55 am") to ISO format.
            Return a JSON array of events with { title, start, end, category }.
            Example input: "Wake Up 5:50-5:55 am; Hydrate & Stretch 5:55-6:00 am"
            Handle both AM/PM and 24-hour formats.`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.events;
  } catch (error) {
    console.error("Failed to parse multiple events:", error);
    throw new Error("Failed to parse multiple events");
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
    console.error("Failed to generate event suggestions:", error);
    throw new Error("Failed to generate event suggestions");
  }
}