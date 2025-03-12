import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseMultipleEvents(text: string): Promise<Array<{
  title: string;
  start: string;
  end: string;
  category?: string;
}>> {
  try {
    const today = new Date().toISOString().split('T')[0]; // Get today's date

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Parse multiple events from a semicolon-separated list. Each event should have a title and time range.
            Convert time formats (like "5:50-5:55 am") to ISO format with today's date (${today}).
            Handle event descriptions that may contain colons.
            Return a JSON array in the format: { "events": [{ "title": string, "start": ISO datetime, "end": ISO datetime, "category": string }] }

            Example input formats:
            - "Wake Up 5:50-5:55 am"
            - "High-Intensity Exercise: Sprints 6:00-6:15 am"
            - "Breakfast: Pre-Prepped Protein Shake 6:25-6:30 am"

            Important:
            - Preserve any text before the time as the title
            - Convert time ranges (e.g., "5:50-5:55 am") into proper ISO datetime strings
            - Set all events to today's date (${today})
            - Detect categories from context (e.g., Exercise, Meals, Work)
            - Ensure all timestamps are in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
            - Handle both AM/PM and 24-hour time formats`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log('AI parsed events:', result.events);

    if (!result.events || !Array.isArray(result.events)) {
      throw new Error("Invalid event format returned from AI");
    }

    // Validate each event has required fields
    const validatedEvents = result.events.map(event => {
      if (!event.title || !event.start || !event.end) {
        throw new Error("Missing required event fields");
      }
      return {
        title: event.title,
        start: new Date(event.start).toISOString(),
        end: new Date(event.end).toISOString(),
        category: event.category || 'default'
      };
    });

    return validatedEvents;
  } catch (error) {
    console.error("Failed to parse multiple events:", error);
    throw new Error("Failed to parse multiple events: " + error.message);
  }
}

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

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Failed to analyze event text:", error);
    throw new Error("Failed to analyze event text");
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

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.suggestions || [];
  } catch (error) {
    console.error("Failed to generate event suggestions:", error);
    throw new Error("Failed to generate event suggestions");
  }
}