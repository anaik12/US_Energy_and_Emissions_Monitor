export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const payload =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const query = payload.query?.trim();
    if (!query) {
      res.status(400).json({ error: "Query text is required." });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
      return;
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful energy-data assistant."
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.4,
        max_tokens: 180
      })
    });

    const data = await openAiResponse.json();
    if (!openAiResponse.ok) {
      res.status(openAiResponse.status).json({
        error: data.error?.message || "OpenAI request failed."
      });
      return;
    }

    const answer = data.choices?.[0]?.message?.content?.trim() || "";
    res.status(200).json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unexpected server error." });
  }
}
