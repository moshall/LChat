import { GoogleGenAI, Type } from "@google/genai";
import { Note, AiSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes recent notes and suggests follow-up ideas or summaries.
 */
export const generateInsights = async (recentNotes: Note[]): Promise<AiSuggestion[]> => {
  if (recentNotes.length === 0) return [];

  const notesText = recentNotes.map(n => `- ${n.content}`).join("\n");

  const prompt = `
    Here are the user's recent fragmented notes:
    ${notesText}

    Based on these notes, generate 2 short, thought-provoking follow-up questions or related topics that would encourage the user to write more.
    Keep them very brief (under 10 words).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["question", "topic"] }
            },
            required: ["text", "type"]
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) return [];

    const suggestions = JSON.parse(jsonStr) as Omit<AiSuggestion, 'id'>[];
    
    return suggestions.map((s, index) => ({
        ...s,
        id: `ai-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return [];
  }
};
