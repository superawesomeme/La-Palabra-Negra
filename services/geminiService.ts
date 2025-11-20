import { GoogleGenAI, Type, Schema } from "@google/genai";
import { RoundData, EvaluationResult } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

// Categories grouped by theme for the Options Panel
export const THEME_CATEGORIES: Record<string, string[]> = {
  "Geografía y Lugares": [
    "Una capital europea",
    "Una capital de Sudamérica",
    "Un país grande",
    "Un país pequeño",
    "Un lugar para una cita",
    "Algo que hay en la playa",
    "Algo que hay en un museo",
    "Algo que hay en un parque",
    "Algo que hay en una oficina"
  ],
  "Animales": [
    "Un animal que se puede ordeñar",
    "Un animal que pone huevos",
    "Un animal acuático",
    "Un animal salvaje",
    "Una mascota",
    "Un animal grande",
    "Un animal pequeño",
    "Algo con alas"
  ],
  "Comida y Bebida": [
    "Un sabor de helado",
    "Una comida frita",
    "Una bebida caliente",
    "Una bebida fría",
    "Algo que se come con cuchara",
    "Algo que se come con las manos",
    "Una comida saludable",
    "Un ingrediente de pizza",
    "Un alimento de desayuno"
  ],
  "Objetos y Cosas": [
    "Un instrumento musical",
    "Algo pegajoso",
    "Una prenda de ropa",
    "Algo mojado",
    "Un mueble",
    "Un medio de transporte",
    "Algo frío",
    "Algo caliente",
    "Algo con ruedas"
  ],
  "Naturaleza y Cuerpo": [
    "Una flor",
    "Un fenómeno meteorológico",
    "Una parte del cuerpo",
    "Un color de ojos"
  ],
  "Sociedad y Personas": [
    "Un saludo",
    "Una profesión",
    "Un idioma",
    "Un miembro de la familia",
    "Una asignatura escolar",
    "Un deporte",
    "Una emoción"
  ],
  "Colores": [
    "Un color",
    "Algo azul",
    "Algo rojo",
    "Algo verde",
    "Algo amarillo",
    "Algo naranja",
    "Algo morado"
  ],
  "Hogar": [
    "Algo que hay en el baño",
    "Algo que hay en el dormitorio"
  ]
};

/**
 * Generates a new round based on enabled theme categories.
 */
export const generateRound = async (enabledCategories: string[]): Promise<RoundData> => {
  // Aggregate all enabled themes
  let availableThemes: string[] = [];
  
  enabledCategories.forEach(catKey => {
    if (THEME_CATEGORIES[catKey]) {
      availableThemes = [...availableThemes, ...THEME_CATEGORIES[catKey]];
    }
  });

  // Fallback if nothing selected
  if (availableThemes.length === 0) {
    availableThemes = THEME_CATEGORIES["Colores"];
  }

  // Select a random theme
  const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)];

  const prompt = `
    Genera una ronda para el juego "La Palabra Negra" basada en el tema: "${theme}".
    
    Reglas:
    1. "Categoría": Usa el tema proporcionado literalmente o con una variación muy ligera para que suene natural como pregunta de juego.
    2. "Palabra Negra": Debe ser la respuesta más obvia, común o cliché para esa categoría en ESPAÑA (Español Peninsular).
    3. El idioma debe ser ESPAÑOL.
    
    Salida JSON estricta.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: "La categoría del juego, por ejemplo 'Un color primario'",
      },
      forbiddenWord: {
        type: Type.STRING,
        description: "La respuesta más obvia (Palabra Negra), por ejemplo 'Rojo'",
      },
    },
    required: ["category", "forbiddenWord"],
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 1.0,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as RoundData;
  } catch (error) {
    console.error("Error generating round:", error);
    return {
      category: "Un color del arcoíris",
      forbiddenWord: "Rojo"
    };
  }
};

/**
 * Evaluates a user's guess.
 */
export const evaluateGuess = async (
  category: string,
  forbiddenWord: string,
  userGuess: string
): Promise<EvaluationResult> => {
  const prompt = `
    Estás arbitrando un juego llamado "La Palabra Negra".
    
    Datos del juego:
    Categoría: "${category}"
    Palabra Negra (Prohibida): "${forbiddenWord}"
    Respuesta del Usuario: "${userGuess}"
    
    Tu tarea es evaluar la respuesta del usuario.
    
    Reglas de evaluación:
    1. "isValid": ¿La respuesta del usuario pertenece lógicamente a la categoría? (True/False)
    2. "isForbidden": ¿Es la respuesta del usuario semánticamente igual o muy similar a la "Palabra Negra"? 
       (Ejemplo: "La manzana" == "Manzana", "Manzanas" == "Manzana", "Automóvil" == "Coche"). Si es así, True.
    3. "normalizedGuess": La palabra del usuario limpia (sin artículos, singular/plural normalizado).
    
    Devuelve JSON.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      isValid: { type: Type.BOOLEAN },
      isForbidden: { type: Type.BOOLEAN },
      reason: { type: Type.STRING, description: "Breve explicación en español" },
      normalizedGuess: { type: Type.STRING },
    },
    required: ["isValid", "isForbidden", "reason", "normalizedGuess"],
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No evaluation response");

    return JSON.parse(text) as EvaluationResult;
  } catch (error) {
    console.error("Error evaluating guess:", error);
    return {
      isValid: true,
      isForbidden: false,
      reason: "Error de conexión, punto otorgado.",
      normalizedGuess: userGuess
    };
  }
};
