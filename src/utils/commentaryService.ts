import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const generateBallCommentary = async (ballEvent: any, match: any, playersMap: Record<string, any>) => {
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
    return response.text || 'What a delivery!';
  } catch (error) {
    console.error('Commentary generation failed:', error);
    return 'Good ball!';
  }
};
