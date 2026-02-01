import { GoogleGenAI, Type } from "@google/genai";

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
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { text: "REFERENCE PERSON (Who to look for):" },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: getBase64(referencePhoto)
              }
            },
            { text: "GALLERY OF PHOTOS (Identify matches by their TARGET_ID):" },
            ...muralPhotos.flatMap(photo => [
              { text: `TARGET_ID: ${photo.id}` },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: getBase64(photo.url)
                }
              }
            ]),
            { text: "INSTRUCTIONS: Compare the REFERENCE PERSON with each person in the GALLERY photos. If the REFERENCE PERSON is present in a gallery photo (even with carnival accessories, makeup, or partial occlusion), include that TARGET_ID in the result array. Accuracy is critical. Return only a JSON array of strings containing the IDs of matching photos." }
          ]
        }
      ],
      config: {
        systemInstruction: "You are an expert AI for facial biometric matching. Your goal is to identify a specific individual across multiple carnival event photos. Ignore cosmetic changes like glitter or simple face paint. Be strictly accurate.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "The unique ID of a matching photo."
          }
        },
        temperature: 0,
      }
    });

    const result = JSON.parse(response.text || "[]");
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Erro na busca facial Gemini:", error);
    return [];
  }
}