// api/products.js — Vercel Serverless Function
// Appelle l'API Shopify Storefront et renvoie les produits au frontend
// Variables d'environnement requises sur Vercel :
//   SHOPIFY_STORE_DOMAIN   → ex: seven-epicerie.myshopify.com
//   SHOPIFY_STOREFRONT_TOKEN → token public Storefront API (lecture seule)

export default async function handler(req, res) {
  // CORS : autorise ton domaine à appeler cet endpoint
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN } = process.env;

  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN) {
    return res.status(500).json({ error: "Variables d'environnement manquantes." });
  }

  const query = `
    {
      products(first: 50, query: "status:active") {
        edges {
          node {
            id
            title
            handle
            featuredImage { url(transform: { maxWidth: 400, maxHeight: 400 }) }
            priceRange {
              minVariantPrice { amount currencyCode }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  price { amount currencyCode }
                  availableForSale
                  quantityAvailable
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query }),
      }
    );

    const data = await response.json();

    const products = data.data.products.edges.map(({ node }) => ({
      id: node.id.replace("gid://shopify/Product/", ""),
      title: node.title,
      handle: node.handle,
      img: node.featuredImage?.url || null,
      price: parseFloat(node.variants.edges[0]?.node.price.amount || 0),
      available: node.variants.edges[0]?.node.availableForSale ?? true,
    }));

    // Cache 5 minutes côté CDN Vercel
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
