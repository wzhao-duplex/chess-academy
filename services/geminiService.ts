
import { GoogleGenAI, Type } from "@google/genai";
import { CoachAdvice } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getCoachAdvice(
  fen: string, 
  lastMove: string | null, 
  turn: string
): Promise<CoachAdvice> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Current Chess Position (FEN): ${fen}\nLast move played: ${lastMove || 'None'}\nIt is ${turn === 'w' ? 'White' : 'Black'}'s turn.\n\nYou are a friendly and encouraging chess coach for a young child learning the game. Analyze the position and provide helpful advice.`,
      config: {
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
              enum: ["good", "neutral", "bad", "mistake"],
              description: "How the current position looks for the player who just moved.",
            },
            funFact: {
              type: Type.STRING,
              description: "A fun fact about one of the pieces currently on the board or general chess history.",
            },
          },
          required: ["explanation", "evaluation"],
        },
      },
    });

    return JSON.parse(response.text.trim()) as CoachAdvice;
  } catch (error) {
    console.error("Gemini Coach Error:", error);
    return {
      explanation: "I'm thinking hard about the board! Keep playing while I analyze.",
      evaluation: "neutral",
    };
  }
}
