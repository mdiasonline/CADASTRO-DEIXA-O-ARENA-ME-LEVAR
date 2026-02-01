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
  
  const getBase64 = (dataUrl: string) => {
    if (!dataUrl || !dataUrl.includes(',')) return dataUrl;
    return dataUrl.split(',')[1];
  };

  try {
    // Usamos o gemini-3-pro-preview por ser uma tarefa complexa de análise visual e raciocínio
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { text: "REFERENCE IMAGE (This is the person we are looking for):" },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: getBase64(referencePhoto)
              }
            },
            { text: "Below are the images from the carnival mural. Each image is preceded by its ID. Analyze each one carefully." },
            ...muralPhotos.flatMap(photo => [
              { text: `TARGET_ID: ${photo.id}` },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: getBase64(photo.url)
                }
              }
            ]),
            { text: "Task: Identify which TARGET_IDs contain the SAME PERSON as in the REFERENCE IMAGE. Carnival context: ignore face paint, glitter, or simple masks; focus on the underlying facial structure. Return ONLY a JSON array of strings containing the IDs." }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a professional facial recognition expert. Your task is to find matches between a reference person and a set of candidate photos from a carnival event. Be precise and account for lighting, angles, and carnival costumes. Return the result strictly as a JSON array of strings containing IDs.",
        responseMimeType: "application/json",
        temperature: 0.1, // Baixa temperatura para maior consistência
      }
    });

    const textOutput = response.text || "[]";
    // Limpeza básica para garantir que o parse funcione se o modelo retornar markdown blocks
    const cleanedJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedJson);
    
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Erro na busca facial Gemini:", error);
    return [];
  }
}