import { GoogleGenAI } from "@google/genai";

function getGeminiClient(): GoogleGenAI | null {
  const apiKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    undefined;

  if (!apiKey) {
    return null;
  }

  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch {
    return null;
  }
}

function getFallbackCommentary(ballEvent: any): string {
  if (ballEvent?.isWicket) return 'OUT! Big breakthrough for the bowling side!';
  if (ballEvent?.extraType === 'wide') return 'Wide ball! Extra run conceded.';
  if (ballEvent?.extraType === 'noBall') return 'No ball! Free hit coming up.';
  if (ballEvent?.runsBatter === 6) return 'SIX! Launched straight into the stands!';
  if (ballEvent?.runsBatter === 4) return 'FOUR! Cracking shot to the boundary!';
  if (ballEvent?.totalRunsOnBall === 0) return 'Dot ball! Tight bowling line.';
  return `Good delivery, ${ballEvent?.totalRunsOnBall || 1} run(s) taken.`;
}

export const generateBallCommentary = async (ballEvent: any, match: any, playersMap: Record<string, any>) => {
  const ai = getGeminiClient();
  if (!ai) {
    return getFallbackCommentary(ballEvent);
  }

  const strikerName = playersMap[ballEvent.strikerId]?.fullName || 'Batter';
  const bowlerName = playersMap[ballEvent.bowlerId]?.fullName || 'Bowler';
  
  const prompt = `Generate a short, enthusiastic cricket commentary for this ball:
  Bowler: ${bowlerName}
  Batter: ${strikerName}
  Runs: ${ballEvent.runsBatter}
  Extra: ${ballEvent.extraType || 'None'}
  Wicket: ${ballEvent.isWicket ? 'Yes' : 'No'}
  Total Runs on ball: ${ballEvent.totalRunsOnBall}
  
  Keep it under 15 words.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });
    return response.text || getFallbackCommentary(ballEvent);
  } catch (error) {
    console.error('Commentary generation failed:', error);
    return getFallbackCommentary(ballEvent);
  }
};
