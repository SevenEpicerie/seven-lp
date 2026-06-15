export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const SHEET_ID = "1b5v3fzVa8xBgrp9IZYmu0mfJodjE3OStLspC1b9ghIw";
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Sheet1`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);?\s*$/)?.[1];
    if (!jsonStr) throw new Error("Impossible de parser la réponse Google Sheets");

    const json = JSON.parse(jsonStr);
    const rows = json.table.rows;
    const cols = json.table.cols.map(c => c.label.toLowerCase().trim());

    console.log("Colonnes détectées:", cols);

    const products = rows
      .filter(row => row.c && row.c[0] && row.c[0].v !== null)
      .map(row => {
        const obj = {};
        cols.forEach((col, i) => {
          obj[col] = row.c[i] ? String(row.c[i].v ?? "").trim() : "";
        });
        return {
          id:          obj.id || String(Math.random()),
          title:       obj.title || "",
          price:       parseFloat(obj.price) || 0,
          category:    obj.category || "Divers",
          subcategory: obj.subcategory || "",
          img:         obj.image || null,
        };
      })
      .filter(p => p.title);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    return res.status(200).json({ products, count: products.length });
  } catch (err) {
    console.error("Erreur:", err.message);
    return res.status(500).json({ error: err.message, products: [] });
  }
}
