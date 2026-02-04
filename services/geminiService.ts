import { GoogleGenAI, Type } from "@google/genai";

export async function generateCarnivalSlogan(nome: string, bloco: string): Promise<string> {
  // Initialize inside the function to use latest API key
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

    // Access .text property directly
    return response.text?.trim() || "Carnaval é alegria!";
  } catch (error) {
    console.error("Erro ao gerar slogan:", error);
    return `Opa! ${nome} no ${bloco} é só folia!`;
  }
}

export async function findFaceMatches(referencePhoto: string, muralPhotos: {id: string, url: string}[]): Promise<string[]> {
  // Initialize inside the function to use latest API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const getBase64 = (dataUrl: string) => {
    if (!dataUrl || !dataUrl.includes(',')) return dataUrl;
    return dataUrl.split(',')[1];
  };

  try {
    // Usamos o gemini-3-pro-preview para maior precisão em análise visual complexa
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      // Use object format for contents as per multimodal guidelines
      contents: {
        parts: [
          { text: "Reference Person (the person looking for their photos):" },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: getBase64(referencePhoto)
            }
          },
          { text: "Gallery of Event Photos (find the reference person in these):" },
          ...muralPhotos.flatMap(photo => [
            { text: `ID: ${photo.id}` },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: getBase64(photo.url)
              }
            }
          ]),
          { text: "Task: Identify which of the Gallery Photos contain the person shown in the Reference Person photo. Carnival context: ignore face paint, accessories, or slight lighting changes. Return a JSON array with the IDs of the matching photos only." }
        ]
      },
      config: {
        systemInstruction: "You are an assistant designed to help people find themselves in a public event gallery. Your goal is to match the face of the reference person with faces in the gallery. Be very precise. Return the result strictly as a JSON list of strings (the IDs).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        },
        temperature: 0.1,
      }
    });

    // Access .text property directly
    const text = response.text;
    if (!text) return [];
    
    try {
      const result = JSON.parse(text);
      return Array.isArray(result) ? result : [];
    } catch (e) {
      console.error("Erro no parse do JSON do Gemini:", text);
      return [];
    }
  } catch (error) {
    console.error("Erro na busca facial Gemini:", error);
    throw error;
  }
}