import { serve } from "https://deno.land/std/http/server.ts";

type RequestBody = {
  roomId: string;
  drawerId: string;
  selectedWord: string;
  roundNumber: number;
  usedWords: string[];
  drawingTime?: number; // optional, default = 60s
};

serve(async (req) => {
  try {
    const {
      roomId,
      drawerId,
      selectedWord,
      roundNumber,
      usedWords,
      drawingTime = 60
    }: RequestBody = await req.json();

    if (!selectedWord || !drawerId || !roomId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const newUsedWords = [...usedWords, selectedWord];

    return new Response(JSON.stringify({
      round: roundNumber,
      drawerId,
      wordLength: selectedWord.length,
      drawingTime,
      usedWords: newUsedWords
    }), { status: 200 });
  } catch (err) {
    console.error("start-round error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
});