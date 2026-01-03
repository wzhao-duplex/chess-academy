import { GoogleGenAI, Type } from "@google/genai";
import { CoachAdvice } from "../types";

// Initialize the Google GenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Fetches coaching advice from the Gemini AI based on the current chess position.
 * Uses gemini-3-pro-preview for advanced reasoning on the chess board.
 */
export async function getCoachAdvice(
  fen: string, 
  lastMove: string | null, 
  turn: string
): Promise<CoachAdvice> {
  try {
    // Directly call ai.models.generateContent to specify the model and parameters.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Current Chess Position (FEN): ${fen}\nLast move played: ${lastMove || 'None'}\nIt is ${turn === 'w' ? 'White' : 'Black'}'s turn.`,
      config: {
        // System instruction defines the coach's persona and helpful tone.
        systemInstruction: "You are a friendly and encouraging chess coach for a young child learning the game. Analyze the position and provide helpful advice, explanation, a suggested next move, and a fun fact.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: {
              type: Type.STRING,
              description: "A friendly explanation of the current situation and why the last move was made.",
            },
            suggestedMove: {
              type: Type.STRING,
              description: "The best next move in algebraic notation (e.g., 'e4', 'Nf3').",
            },
            evaluation: {
              type: Type.STRING,
              description: "How the current position looks for the player who just moved. Valid values: 'good', 'neutral', 'bad', 'mistake'.",
            },
            funFact: {
              type: Type.STRING,
              description: "A fun fact about one of the pieces currently on the board or general chess history.",
            },
          },
          required: ["explanation", "evaluation"],
          propertyOrdering: ["explanation", "suggestedMove", "evaluation", "funFact"],
        },
      },
    });

    // Access the .text property directly from the response object.
    const text = response.text || "{}";
    return JSON.parse(text.trim()) as CoachAdvice;
  } catch (error) {
    console.error("Gemini Coach Error:", error);
    return {
      explanation: "I'm thinking hard about the board! Keep playing while I analyze.",
      evaluation: "neutral",
    };
  }
}