const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Headers de navigateur réels pour contourner les WAF basiques
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

// Route d'extraction principale
app.get('/extract', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'URL manquante' });
    }

    console.log(`[Extraction en cours] ${targetUrl}`);

    const response = await axios.get(targetUrl, {
      headers: BROWSER_HEADERS,
      timeout: 15000, // Timeout de 15 secondes
      maxRedirects: 5,
      responseType: 'text',
      maxContentLength: 10 * 1024 * 1024, // Limite à 10MB
      decompress: true
    });

    console.log(`[Succès] ${targetUrl} - ${response.data.length} octets reçus`);

    return res.json({
      success: true,
      html: response.data,
      status: response.status,
      size: response.data.length
    });

  } catch (error) {
    console.error(`[Erreur] ${req.query.url} -`, error.message);
    
    let errorMessage = 'Erreur inconnue';
    let statusCode = 500;

    if (error.response) {
      // Le site a répondu avec une erreur (ex: 403, 404)
      statusCode = error.response.status;
      errorMessage = `Le site cible a renvoyé une erreur ${error.response.status}`;
    } else if (error.request) {
      // Pas de réponse (timeout, DNS, etc.)
      errorMessage = 'Le site cible ne répond pas ou bloque la connexion (Timeout/Cloudflare)';
    } else {
      errorMessage = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CodeSlime Backend' });
});

app.listen(PORT, () => {
  console.log(`🟢 CodeSlime Backend démarré sur http://localhost:${PORT}`);
});
