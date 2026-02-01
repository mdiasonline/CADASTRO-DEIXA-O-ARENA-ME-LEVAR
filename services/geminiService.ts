
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

export async function findFaceMatches(referencePhoto: string, muralPhotos: {id: string, url: string}[]): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Extrair base64 puras (remover prefixo data:image/...)
  const getBase64 = (dataUrl: string) => dataUrl.split(',')[1];

  try {
    // Preparar as partes para o Gemini
    // Parte 1: Instrução
    const textPart = {
      text: `TASK: FACIAL RECOGNITION.
      I am providing a REFERENCE image (the first image) and a list of TARGET images.
      Identify which of the TARGET images contain the SAME person shown in the REFERENCE image.
      Carnival context: People might be wearing glitter, masks, or costumes. Focus on facial features and structure.
      RETURN: A JSON array containing ONLY the IDs of the matching TARGET images.
      Example Output: ["id123", "id456"]`
    };

    // Parte 2: Imagem de referência
    const referencePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: getBase64(referencePhoto)
      }
    };

    // Partes 3+: Imagens do mural com seus respectivos IDs
    const targetParts = muralPhotos.flatMap(photo => [
      { text: `TARGET_ID: ${photo.id}` },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: getBase64(photo.url)
        }
      }
    ]);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [textPart, referencePart, ...targetParts] 
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || "[]");
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Erro na busca facial:", error);
    return [];
  }
}
