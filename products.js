// api/products.js — lit le Google Sheet public SEVEN Catalogue
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const SHEET_ID = "1b5v3fzVa8xBgrp9IZYmu0mfJodjE3OStLspC1b9ghIw";
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    // Google renvoie du JSONP — on extrait le JSON
    const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/)[1]);
    const rows = json.table.rows;
    const cols = json.table.cols.map(c => c.label.toLowerCase());

    const products = rows
      .filter(row => row.c && row.c[0] && row.c[0].v) // ignorer lignes vides
      .map(row => {
        const obj = {};
        cols.forEach((col, i) => {
          obj[col] = row.c[i] ? row.c[i].v : null;
        });
        return {
          id:       String(obj.id || ""),
          title:    String(obj.title || ""),
          price:    parseFloat(obj.price) || 0,
          category: String(obj.category || "").toLowerCase(),
          img:      obj.image ? String(obj.image) : null,
        };
      });

    // Cache 2 minutes
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate");
    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({ error: err.message, products: [] });
  }
}
