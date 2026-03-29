const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Data loading functions
function loadJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

// Load all data
const dataPath = '../data';
const masterAds = loadJsonFile(path.join(__dirname, dataPath, 'top_ads_master_list.json'));
const overviewStats = loadJsonFile(path.join(__dirname, dataPath, 'dashboard_overview_stats.json'));
const analysisResults = loadJsonFile(path.join(__dirname, dataPath, 'analysis_results', 'sample_analysis_consolidated.json'));
const analysisSummary = loadJsonFile(path.join(__dirname, dataPath, 'analysis_results', 'analysis_summary.json'));

// API Routes
app.get('/api/overview', (req, res) => {
  res.json(overviewStats);
});

app.get('/api/ads', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  const brand = req.query.brand || '';

  let filteredAds = masterAds || [];

  // Apply filters
  if (search) {
    filteredAds = filteredAds.filter(ad => 
      ad.title?.toLowerCase().includes(search.toLowerCase()) ||
      ad.body?.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (brand) {
    filteredAds = filteredAds.filter(ad => {
      const adBrand = typeof ad.brand === 'object' ? ad.brand?.name : ad.brand;
      return adBrand?.toLowerCase().includes(brand.toLowerCase());
    });
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedAds = filteredAds.slice(startIndex, endIndex);

  // Add analysis data to ads
  const adsWithAnalysis = paginatedAds.map(ad => {
    const analysis = analysisResults?.[ad.id] || null;
    return { ...ad, analysis };
  });

  res.json({
    ads: adsWithAnalysis,
    totalCount: filteredAds.length,
    totalPages: Math.ceil(filteredAds.length / limit),
    currentPage: page
  });
});

app.get('/api/analysis-summary', (req, res) => {
  res.json(analysisSummary);
});

app.get('/api/video-transcripts', (req, res) => {
  const transcriptsPath = path.join(__dirname, '../videos');
  const transcripts = [];
  
  try {
    const files = fs.readdirSync(transcriptsPath);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    
    for (const file of txtFiles) {
      const videoId = file.replace('.txt', '');
      const content = fs.readFileSync(path.join(transcriptsPath, file), 'utf8');
      const videoPath = path.join(transcriptsPath, `${videoId}.mp4`);
      const hasVideo = fs.existsSync(videoPath);
      
      transcripts.push({
        id: videoId,
        transcript: content,
        videoPath: hasVideo ? `../videos/${videoId}.mp4` : null
      });
    }
  } catch (error) {
    console.error('Error loading transcripts:', error);
  }
  
  res.json(transcripts);
});

app.get('/api/landing-pages', (req, res) => {
  if (!masterAds) {
    return res.json([]);
  }

  // Extract unique landing pages
  const landingPages = {};
  masterAds.forEach(ad => {
    if (ad.landing_page) {
      if (!landingPages[ad.landing_page]) {
        landingPages[ad.landing_page] = {
          url: ad.landing_page,
          count: 0,
          brands: new Set()
        };
      }
      landingPages[ad.landing_page].count++;
      const brandName = typeof ad.brand === 'object' ? ad.brand?.name : ad.brand;
      if (brandName) {
        landingPages[ad.landing_page].brands.add(brandName);
      }
    }
  });

  // Convert to array and format
  const lpArray = Object.values(landingPages).map(lp => ({
    ...lp,
    brands: Array.from(lp.brands)
  })).sort((a, b) => b.count - a.count);

  res.json(lpArray);
});

// Serve main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Rosabella Analysis Dashboard running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the dashboard`);
});