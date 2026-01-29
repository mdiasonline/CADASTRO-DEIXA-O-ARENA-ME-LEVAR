
import { GoogleGenAI } from "@google/genai";

export async function generateCarnivalSlogan(nome: string, bloco: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere um slogan curto, engraçado e festivo de carnaval para uma pessoa chamada "${nome}" que vai desfilar no bloco "${bloco}". O slogan deve ter no máximo 15 palavras e ser bem brasileiro.`,
      config: {
        temperature: 0.8,
        topP: 0.95,
      },
    });

    return response.text?.trim() || "Carnaval é alegria!";
  } catch (error) {
    console.error("Erro ao gerar slogan:", error);
    return `Opa! ${nome} no ${bloco} é só folia!`;
  }
}
