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
          text = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            text = text.slice(start, end + 1);
            try {
              // Parse and clean by re-stringifying
              const obj = JSON.parse(text);
              // Deep clean all string values
              const clean = JSON.parse(JSON.stringify(obj, (key, val) => {
                if (typeof val === 'string') {
                  return val
                    .replace(/\n/g, ' ')
                    .replace(/\r/g, ' ')
                    .replace(/\t/g, ' ')
                    .replace(/\\/g, '')
                    .trim();
                }
                return val;
              }));
              block.text = JSON.stringify(clean);
            } catch(e) {
              // Manual fix for unterminated strings
              let fixed = text
                .replace(/[\r\n\t]/g, ' ')
                .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1$2')
                .replace(/\s+/g, ' ');
              try {
                const obj2 = JSON.parse(fixed);
                block.text = JSON.stringify(obj2);
              } catch(e2) {
                block.text = JSON.stringify({ error: 'Could not parse response' });
              }
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
