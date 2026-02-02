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
    // Flash é mais rápido e estável para comparação de múltiplas partes de imagem
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Find the person from the FIRST IMAGE in the other images provided below. Return a JSON array with the matching IDs." },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: getBase64(referencePhoto)
              }
            },
            ...muralPhotos.flatMap(photo => [
              { text: `ID:${photo.id}` },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: getBase64(photo.url)
                }
              }
            ])
          ]
        }
      ],
      config: {
        systemInstruction: "You are an image matching expert for a fun carnival app. Your only job is to return a JSON array of strings containing the IDs of images where the person from the first image appears. If no matches, return [].",
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

    const text = response.text;
    if (!text) return [];
    
    try {
      const result = JSON.parse(text);
      return Array.isArray(result) ? result : [];
    } catch (e) {
      console.error("Erro no parse do Gemini:", text);
      return [];
    }
  } catch (error: any) {
    // Log detalhado para depuração sem quebrar o app
    console.error("Erro na API Gemini Vision:", error);
    throw new Error("Falha na análise da IA. Isso pode ocorrer devido a filtros de segurança ou conexões instáveis.");
  }
}