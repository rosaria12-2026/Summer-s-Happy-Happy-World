export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    const { system, user, max_tokens } = req.body;
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
    const data = await response.json();
    if (data.content && Array.isArray(data.content)) {
      data.content = data.content.map(block => {
        if (block.type === 'text' && block.text) {
          let text = block.text.trim();
          // Remove markdown
          text = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
          // Extract JSON boundaries
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            text = text.slice(start, end + 1);
            // Parse and re-stringify to fix all issues
            try {
              const parsed = JSON.parse(text);
              block.text = JSON.stringify(parsed);
            } catch(e) {
              // If parse fails, do manual cleanup
              text = text
                .replace(/\r\n/g, ' ')
                .replace(/\r/g, ' ')
                .replace(/\n/g, ' ')
                .replace(/\t/g, ' ');
              block.text = text;
            }
          }
        }
        return block;
      });
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
