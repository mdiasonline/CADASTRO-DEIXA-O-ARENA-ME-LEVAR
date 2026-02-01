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
    // Usamos o gemini-3-flash-preview para maior velocidade e resiliência com múltiplas imagens
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "USER REFERENCE PHOTO (Identify this person):" },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: getBase64(referencePhoto)
              }
            },
            { text: "EVENT GALLERY (Find matching appearances):" },
            ...muralPhotos.flatMap(photo => [
              { text: `PHOTO_ID: ${photo.id}` },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: getBase64(photo.url)
                }
              }
            ]),
            { text: "INSTRUCTION: Your task is to help a user find their own photos in a carnival event gallery. Compare the person in the 'USER REFERENCE PHOTO' with people in each photo from the 'EVENT GALLERY'. If you find a match, return the corresponding PHOTO_ID in a JSON array. Consider carnival context (glitter, accessories). Return ONLY the JSON array." }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a helpful assistant for a carnival event app. You help users find photos of themselves in a public gallery by comparing their selfie with other images. Be accurate and focused on facial structure.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "A matching PHOTO_ID."
          }
        },
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const result = JSON.parse(text);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Erro detalhado na busca facial Gemini:", error);
    // Relançamos para que o App.tsx possa capturar e informar o erro corretamente
    throw error;
  }
}