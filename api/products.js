export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Export CSV directement - beaucoup plus simple à parser
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTKxdPl6tfwe2DN8xy3HRV98ZTswfoCn1vze9k3ua0LVWD9BJN1yXsmVtASyZO3KuSYVz9YTCMEB0C5/pub?gid=1004469743&single=true&output=csv";

  try {
    const response = await fetch(url);
    const text = await response.text();

    // Parser CSV simple
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    const products = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        // Parser CSV en tenant compte des virgules dans les guillemets
        const cols = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') { inQuotes = !inQuotes; }
          else if (char === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
          else { current += char; }
        }
        cols.push(current.trim());

        const get = (key) => {
          const idx = headers.indexOf(key);
          return idx >= 0 ? (cols[idx] || '').replace(/"/g, '').trim() : '';
        };

        return {
          id:          get('id') || String(Math.random()),
          title:       get('title'),
          price:       parseFloat(get('price')) || 0,
          category:    get('category') || 'Divers',
          subcategory: get('subcategory') || '',
          img:         get('image') || null,
        };
      })
      .filter(p => p.title && p.title.length > 0);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    return res.status(200).json({ products, count: products.length, headers });
  } catch (err) {
    return res.status(500).json({ error: err.message, products: [] });
  }
}
