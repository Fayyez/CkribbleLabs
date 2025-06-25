import { serve } from "https://deno.land/std/http/server.ts";

type RequestBody = {
  theme?: string;
  count?: number;
  usedWords?: string[];
};

const WORD_BANK_PATH = "../__shared_data/wordbank"

serve(async (req) => {
  const { theme = "default", count = 3, usedWords = [] }: RequestBody = await req.json();

  try {
    const path = `.${WORD_BANK_PATH}/${theme}.json`;
    const file = await Deno.readTextFile(path);
    const wordList: string[] = JSON.parse(file);

    // Filter out used words
    const available = wordList.filter(word => !usedWords.includes(word));

    if (available.length < count) {
      return new Response(
        JSON.stringify({ error: "Not enough unused words available." }),
        { status: 400 }
      );
    }

    // Shuffle and return N words
    const selected = available.sort(() => 0.5 - Math.random()).slice(0, count);

    return new Response(JSON.stringify({ words: selected }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Theme not found or invalid JSON." }),
      { status: 500 }
    );
  }
});
