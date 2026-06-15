export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const SHEET_ID = "1b5v3fzVa8xBgrp9IZYmu0mfJodjE3OStLspC1b9ghIw";
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=seven-catalogue&headers=1`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);?\s*$/)?.[1];
    if (!jsonStr) throw new Error("Impossible de parser la réponse Google Sheets");

    const json = JSON.parse(jsonStr);
    const rows = json.table.rows;
    // Colonnes : A=id, B=title, C=price, D=category, E=subcategory, F=image
    const products = rows
      .filter(row => row.c && row.c[1] && row.c[1].v)
      .map(row => {
        const get = (i) => row.c[i] ? String(row.c[i].v ?? "").trim() : "";
        return {
          id:          get(0) || String(Math.random()),
          title:       get(1),
          price:       parseFloat(get(2)) || 0,
          category:    get(3) || "Divers",
          subcategory: get(4) || "",
          img:         get(5) || null,
        };
      })
      .filter(p => p.title && p.title !== "title");

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    return res.status(200).json({ products, count: products.length });
  } catch (err) {
    console.error("Erreur:", err.message);
    return res.status(500).json({ error: err.message, products: [] });
  }
}
