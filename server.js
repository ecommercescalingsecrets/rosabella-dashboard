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
const dataPath = './data';
const masterAds = loadJsonFile(path.join(__dirname, dataPath, 'top_ads_master_list.json'));
const overviewStats = loadJsonFile(path.join(__dirname, dataPath, 'dashboard_overview_stats.json'));
const analysisResults = loadJsonFile(path.join(__dirname, dataPath, 'analysis_results', 'sample_analysis_consolidated.json'));
const analysisSummary = loadJsonFile(path.join(__dirname, dataPath, 'analysis_results', 'analysis_summary.json'));

// Load and consolidate all individual analysis files
function loadAllAnalysisData() {
  const analysisDir = path.join(__dirname, dataPath, 'analysis_results');
  const consolidatedAnalysis = { ...(analysisResults || {}) };
  
  try {
    const files = fs.readdirSync(analysisDir);
    const analysisFiles = files.filter(file => file.startsWith('ad_') && file.endsWith('_analysis.json'));
    
    for (const file of analysisFiles) {
      try {
        const adId = file.replace('ad_', '').replace('_analysis.json', '');
        const analysis = loadJsonFile(path.join(analysisDir, file));
        if (analysis && !consolidatedAnalysis[adId]) {
          consolidatedAnalysis[adId] = analysis;
        }
      } catch (error) {
        console.error(`Error loading ${file}:`, error);
      }
    }
  } catch (error) {
    console.error('Error reading analysis directory:', error);
  }
  
  return consolidatedAnalysis;
}

const allAnalysisData = loadAllAnalysisData();

// API Routes
app.get('/api/overview', (req, res) => {
  const hardcodedPageStats = [
    {"name": "Rosabella Beetroot", "active": 961, "total": 2301},
    {"name": "Rosabella", "active": 843, "total": 16598},
    {"name": "Essential Health Finds", "active": 674, "total": 5143},
    {"name": "Energy & Wellness Club", "active": 598, "total": 2383},
    {"name": "Dr. David Preston", "active": 495, "total": 4884},
    {"name": "The Heart Health Project", "active": 294, "total": 1769},
    {"name": "Circulation Science Daily", "active": 224, "total": 3367},
    {"name": "Primus Health", "active": 137, "total": 470},
    {"name": "Paul from Rosabella", "active": 110, "total": 610},
    {"name": "Eat Smart with Dr. Amanda Johnson", "active": 109, "total": 2185},
    {"name": "Cortisol Reset Project", "active": 53},
    {"name": "Gut & Parasite Health Tips", "active": 37},
    {"name": "Wendy Bolton", "active": 29, "total": 112},
    {"name": "Rosabella Moringa", "active": 25, "total": 902},
    {"name": "Dr. Julie Abboud", "active": 21},
    {"name": "ClarityLabs", "active": 14, "total": 205},
    {"name": "Paul N", "active": 1}
  ];
  
  const totalActive = hardcodedPageStats.reduce((sum, page) => sum + page.active, 0);
  const totalHistorical = hardcodedPageStats.reduce((sum, page) => sum + (page.total || 0), 0);
  
  const overview = {
    ...overviewStats,
    total_active_ads: totalActive,
    total_historical_ads: totalHistorical,
    page_breakdown: hardcodedPageStats
  };
  
  res.json(overview);
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
    const analysis = allAnalysisData?.[ad.id] || null;
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
  // Generate summary from all analysis data
  const hookTypes = {};
  const proofElements = {};
  const mechanisms = {};
  const funnelTypes = {};
  
  Object.values(allAnalysisData).forEach(analysis => {
    if (analysis.angle_hook_type?.value) {
      hookTypes[analysis.angle_hook_type.value] = (hookTypes[analysis.angle_hook_type.value] || 0) + 1;
    }
    
    if (analysis.proof_elements?.value && Array.isArray(analysis.proof_elements.value)) {
      analysis.proof_elements.value.forEach(element => {
        proofElements[element] = (proofElements[element] || 0) + 1;
      });
    }
    
    if (analysis.unique_mechanism?.value) {
      mechanisms[analysis.unique_mechanism.value] = (mechanisms[analysis.unique_mechanism.value] || 0) + 1;
    }
    
    if (analysis.landing_page_funnel?.value) {
      funnelTypes[analysis.landing_page_funnel.value] = (funnelTypes[analysis.landing_page_funnel.value] || 0) + 1;
    }
  });
  
  const summary = {
    hook_types: hookTypes,
    proof_elements: proofElements,
    mechanisms: mechanisms,
    funnel_types: funnelTypes,
    total_analyzed: Object.keys(allAnalysisData).length
  };
  
  res.json(summary);
});

app.get('/api/video-transcripts', (req, res) => {
  const transcriptsPath = path.join(__dirname, './data/transcripts');
  const videoMetadata = loadJsonFile(path.join(__dirname, dataPath, 'top_20_videos_for_transcription.json'));
  const transcripts = [];
  
  try {
    const files = fs.readdirSync(transcriptsPath);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    
    for (const file of txtFiles) {
      const videoId = file.replace('.txt', '');
      const content = fs.readFileSync(path.join(transcriptsPath, file), 'utf8');
      
      // Find corresponding video ad data
      let videoUrl = null;
      let adData = null;
      
      if (videoMetadata && Array.isArray(videoMetadata)) {
        adData = videoMetadata.find(video => video.id && video.id.toString() === videoId.replace('ad_', ''));
      }
      
      // If not found in metadata, search master ads
      if (!adData && masterAds) {
        adData = masterAds.find(ad => ad.id && ad.id.toString() === videoId.replace('ad_', ''));
      }
      
      // Extract video URL from ad media
      if (adData && adData.media && Array.isArray(adData.media)) {
        const videoMedia = adData.media.find(m => m.type === 'video' || m.url?.includes('.mp4'));
        if (videoMedia) {
          videoUrl = videoMedia.url;
        }
      }
      
      transcripts.push({
        id: videoId,
        transcript: content,
        videoUrl: videoUrl,
        adData: adData ? {
          id: adData.id,
          title: adData.title,
          share_url: adData.share_url,
          brand: typeof adData.brand === 'object' ? adData.brand?.name : adData.brand
        } : null
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
});// Sun Mar 29 18:27:56 EDT 2026

// Debug endpoint
app.get('/api/debug', (req, res) => {
  const fs = require('fs');
  const debugInfo = {
    dirname: __dirname,
    cwd: process.cwd(),
    dataPathResolved: require('path').join(__dirname, './data'),
    dataExists: fs.existsSync(require('path').join(__dirname, './data')),
    dataContents: [],
    masterAdsLoaded: !!masterAds,
    masterAdsCount: masterAds?.length || 0,
    overviewLoaded: !!overviewStats
  };
  try {
    debugInfo.dataContents = fs.readdirSync(require('path').join(__dirname, './data'));
  } catch(e) {
    debugInfo.dataError = e.message;
  }
  try {
    debugInfo.appContents = fs.readdirSync(__dirname);
  } catch(e) {}
  res.json(debugInfo);
});
