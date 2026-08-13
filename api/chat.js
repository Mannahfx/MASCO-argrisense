export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, context } = req.body;
    
    // Fallback if no GROQ_API_KEY_AGRISENSE is provided.
    if (!process.env.GROQ_API_KEY_AGRISENSE) {
      return res.status(500).json({ error: 'Missing GROQ_API_KEY_AGRISENSE environment variable. Please add it to your Vercel project.' });
    }

    const systemPrompt = `You are a friendly, highly professional, and expert Manna Agronomist. 
You are advising a farmer named ${context.profile.full_name || 'Farmer'} from ${context.profile.location || 'their farm'}.
They recently scanned a cassava plant and the AI detected: ${context.disease.name}.
Confidence level of detection: ${context.scan.confidence}%.

Your goal:
1. Provide accurate, practical, and step-by-step guidance on treating the disease.
2. Recommend Manna-branded products if applicable.
3. Keep responses concise, supportive, and conversational. Do not output massive walls of text.
4. If they ask about local dealers or where to buy, tell them they can use the "Find Nearest Dealer" feature in the Manna app.
5. If they confirm they have completed the treatment, enthusiastically congratulate them and tell them to tap the "Mark as Treated" button in the app to record it.
`;

    // Construct the payload matching OpenAI's format (which Groq uses)
    const payload = {
      model: "llama-3.1-8b-instant", // Fast and free Groq model
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({
          role: m.sender === 'ai' ? 'assistant' : 'user',
          content: m.text
        }))
      ],
      temperature: 0.7,
      max_tokens: 500,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY_AGRISENSE}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return res.status(response.status).json({ error: 'Failed to communicate with AI API.' });
    }

    const data = await response.json();
    const replyText = data.choices[0].message.content;

    res.status(200).json({ text: replyText });
  } catch (error) {
    console.error("Serverless function error:", error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
