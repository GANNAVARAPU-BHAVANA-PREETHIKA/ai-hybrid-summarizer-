import { GoogleGenAI } from "@google/genai";
import { SummaryResponse } from "../types";

const BACKEND_URL = 'http://127.0.0.1:8000/summarize';

// 1. Call the custom backend to get BERT and T5 summaries
export const fetchIntermediateSummaries = async (text: string): Promise<SummaryResponse> => {
  try {
    // Attempt to call the backend with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Backend API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (typeof data.bert_extractive !== 'string' || typeof data.t5_abstractive !== 'string') {
      throw new Error("Invalid response format from summarization backend.");
    }

    return data as SummaryResponse;
  } catch (error) {
    console.warn("Backend extraction failed. Falling back to Gemini-only analysis.", error);
    
    // Fallback response to ensure the application continues even if the backend is down/blocked
    return {
      bert_extractive: "Service Unavailable: The BERT summarization engine could not be reached. Proceeding with Gemini analysis.",
      t5_abstractive: "Service Unavailable: The T5 summarization engine could not be reached. Proceeding with Gemini analysis."
    };
  }
};

// 2. Call Gemini to synthesize the final result
export const generateFinalSummary = async (
  originalText: string,
  bertSummary: string,
  t5Summary: string
): Promise<string> => {
  
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
You are an expert executive summarizer. 
I have three sources of information for a single document:
1. The ORIGINAL TEXT (extracted below).
2. A BERT Extractive Summary (picks key sentences).
3. A T5 Abstractive Summary (rewrites the main idea).

Your task:
Synthesize these three inputs into one high-quality FINAL SUMMARY.
Follow this format EXACTLY:

**Paragraph:**

(Write a cohesive paragraph of 5–7 concise sentences summarizing the essence of the content.)

**Bullet Points:**
- (Key point 1)
- (Key point 2)
- (Key point 3)
- (Key point 4)
- (Key point 5)

--- 
INPUTS:

[BERT SUMMARY]
${bertSummary}

[T5 SUMMARY]
${t5Summary}

[ORIGINAL TEXT PREVIEW (First 500000 chars)]
${originalText.slice(0, 500000)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Failed to generate summary.";
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate final summary with Gemini.");
  }
};