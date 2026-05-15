export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    const { system, user, max_tokens } = req.body;
    if (!user) return res.status(400).json({ error: 'user content is required' });
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: max_tokens || 4000,
        system: system,
        messages: [{ role: 'user', content: user }]
      })
    });
    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json(err);
    }
    let data = await response.json();
    if (data.content && Array.isArray(data.content)) {
      data.content = data.content.map(block => {
        if (block.type === 'text' && typeof block.text === 'string') {
          let text = block.text.trim();
          text = text
            .replace(/```json\s*/gi, '')
            .replace(/```\s*$/gi, '')
            .trim();
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            let jsonStr = text.slice(start, end + 1);
            jsonStr = jsonStr
              .replace(/\r/g, '')
              .replace(/\n/g, '\\n')
              .replace(/\t/g, '\\t');
            block.text = jsonStr;
          } else {
            block.text = text;
          }
        }
        return block;
      });
    }
    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
