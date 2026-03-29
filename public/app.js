// Global variables
let currentPage = 1;
let allAds = [];
let currentAds = [];
let overviewData = {};
let analysisData = {};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadOverviewData();
    loadAnalysisData();
    loadAds();
    loadVideoTranscripts();
    loadLandingPages();
    
    // Add event listeners for search
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchAds();
        }
    });
});

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Highlight active tab button
    event.target.classList.remove('border-transparent', 'text-gray-500');
    event.target.classList.add('border-blue-500', 'text-blue-600');
}

// Load overview data
async function loadOverviewData() {
    try {
        const response = await fetch('/api/overview');
        overviewData = await response.json();
        
        if (overviewData) {
            document.getElementById('overviewActiveAds').textContent = overviewData.total_active_ads?.toLocaleString() || '4,625';
            document.getElementById('overviewHistoricalAds').textContent = overviewData.total_historical_ads?.toLocaleString() || '40,929';
            
            // Update header stats
            document.getElementById('totalAds').textContent = overviewData.total_active_ads?.toLocaleString() || '4,625';
            
            createPageBreakdownChart();
            populatePageBreakdownTable();
        }
    } catch (error) {
        console.error('Error loading overview data:', error);
    }
}

// Load analysis data
async function loadAnalysisData() {
    try {
        const response = await fetch('/api/analysis-summary');
        analysisData = await response.json();
        
        if (analysisData) {
            createAnalysisCharts();
        }
    } catch (error) {
        console.error('Error loading analysis data:', error);
    }
}

// Load ads with pagination
async function loadAds(page = 1, search = '', brand = '') {
    try {
        const response = await fetch(`/api/ads?page=${page}&limit=20&search=${encodeURIComponent(search)}&brand=${encodeURIComponent(brand)}`);
        const data = await response.json();
        
        currentAds = data.ads || [];
        displayAds(currentAds);
        createPagination(data.totalPages, data.currentPage);
        
        // Populate brand filter if it's empty
        if (document.getElementById('brandFilter').children.length === 1) {
            populateBrandFilter(currentAds);
        }
    } catch (error) {
        console.error('Error loading ads:', error);
    }
}

// Display ads in grid
function displayAds(ads) {
    const grid = document.getElementById('adsGrid');
    grid.innerHTML = '';
    
    ads.forEach(ad => {
        const brandName = typeof ad.brand === 'object' ? ad.brand?.name : ad.brand || 'Unknown';
        const analysis = ad.analysis || {};
        
        const adCard = document.createElement('div');
        adCard.className = 'bg-white rounded-lg shadow ad-card overflow-hidden';
        
        // Build media section
        let mediaSection = '';
        if (ad.media && ad.media.length > 0) {
            const media = ad.media[0];
            if (media.type === 'video') {
                mediaSection = `
                    <video class="w-full h-48 object-cover video-player" controls>
                        <source src="${media.url}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `;
            } else if (media.type === 'image') {
                mediaSection = `
                    <img src="${media.url}" alt="Ad creative" class="w-full h-48 object-cover">
                `;
            }
        }
        
        // Build analysis section
        let analysisSection = '';
        if (analysis.unique_mechanism) {
            analysisSection = `
                <div class="mt-4 p-3 bg-gray-50 rounded">
                    <h4 class="font-semibold text-sm mb-2">💡 Analysis</h4>
                    <p class="text-xs text-gray-600 mb-1"><strong>Mechanism:</strong> ${analysis.unique_mechanism.value || 'N/A'}</p>
                    <p class="text-xs text-gray-600 mb-1"><strong>Hook Type:</strong> ${analysis.angle_hook_type?.value || 'N/A'}</p>
                    <p class="text-xs text-gray-600"><strong>Proof:</strong> ${analysis.proof_elements?.value?.join(', ') || 'N/A'}</p>
                </div>
            `;
        }
        
        adCard.innerHTML = `
            <div class="p-4">
                ${mediaSection}
                <div class="mt-4">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-sm font-semibold text-blue-600">${brandName}</span>
                        ${ad.performance_score ? `<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Score: ${ad.performance_score}</span>` : ''}
                    </div>
                    <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">${ad.title || 'No title'}</h3>
                    <p class="text-sm text-gray-600 mb-3 line-clamp-3">${(ad.body || '').substring(0, 150)}${(ad.body || '').length > 150 ? '...' : ''}</p>
                    
                    <div class="flex justify-between items-center text-xs text-gray-500 mb-3">
                        <span>📅 ${ad.days_active || 0} days active</span>
                        <span>👁️ ${ad.display_format || 'Unknown'}</span>
                    </div>
                    
                    ${analysisSection}
                    
                    <div class="mt-4 flex space-x-2">
                        ${ad.share_url ? `<a href="${ad.share_url}" target="_blank" class="gethookd-link text-xs">🔗 View on Gethookd</a>` : ''}
                        ${ad.landing_page ? `<a href="${ad.landing_page}" target="_blank" class="text-xs text-purple-600 hover:underline">🌐 Landing Page</a>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        grid.appendChild(adCard);
    });
}

// Search functionality
function searchAds() {
    const search = document.getElementById('searchInput').value;
    const brand = document.getElementById('brandFilter').value;
    currentPage = 1;
    loadAds(currentPage, search, brand);
}

// Create pagination
function createPagination(totalPages, currentPageNum) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    for (let i = 1; i <= Math.min(totalPages, 10); i++) {
        const button = document.createElement('button');
        button.className = `px-3 py-2 text-sm ${i === currentPageNum ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} border border-gray-300 rounded`;
        button.textContent = i;
        button.onclick = () => {
            currentPage = i;
            const search = document.getElementById('searchInput').value;
            const brand = document.getElementById('brandFilter').value;
            loadAds(currentPage, search, brand);
        };
        pagination.appendChild(button);
    }
}

// Populate brand filter
function populateBrandFilter(ads) {
    const brandFilter = document.getElementById('brandFilter');
    const brands = new Set();
    
    ads.forEach(ad => {
        const brandName = typeof ad.brand === 'object' ? ad.brand?.name : ad.brand;
        if (brandName) {
            brands.add(brandName);
        }
    });
    
    Array.from(brands).sort().forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        brandFilter.appendChild(option);
    });
}

// Create page breakdown chart
function createPageBreakdownChart() {
    const chartElement = document.getElementById('pageBreakdownChart');
    if (!chartElement) return;
    
    const ctx = chartElement.getContext('2d');
    
    const data = overviewData.page_breakdown || [];
    const labels = data.map(item => item.name);
    const values = data.map(item => item.active);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Active Ads',
                data: values,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Populate page breakdown table
function populatePageBreakdownTable() {
    const tableBody = document.getElementById('pageBreakdownTable');
    if (!tableBody) return;
    
    const data = overviewData.page_breakdown || [];
    const totalActive = data.reduce((sum, item) => sum + item.active, 0);
    
    tableBody.innerHTML = '';
    
    data.forEach(item => {
        const percentage = totalActive > 0 ? ((item.active / totalActive) * 100).toFixed(1) : 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${item.name}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.active?.toLocaleString()}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.total?.toLocaleString() || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${percentage}%</td>
            <td class="px-4 py-3 text-sm text-gray-600">${getStrategyType(item.name)}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Get strategy type for page
function getStrategyType(pageName) {
    if (pageName.includes('Dr.') || pageName.includes('Doctor')) return 'Authority Figure';
    if (pageName.includes('Health') || pageName.includes('Wellness')) return 'Health Expert';
    if (pageName.includes('Rosabella')) return 'Brand Direct';
    if (pageName.includes('Science') || pageName.includes('Lab')) return 'Scientific Authority';
    return 'Lifestyle/Community';
}

// Create analysis charts
function createAnalysisCharts() {
    if (!analysisData) return;
    
    // Hook types chart
    if (analysisData.hook_types) {
        createChart('hookTypesChart', 'doughnut', analysisData.hook_types, 'Hook Types');
    }
    
    // Proof elements chart
    if (analysisData.proof_elements) {
        createChart('proofElementsChart', 'bar', analysisData.proof_elements, 'Proof Elements');
    }
    
    // Mechanisms chart
    if (analysisData.mechanisms) {
        createChart('mechanismsChart', 'pie', analysisData.mechanisms, 'Mechanisms');
    }
    
    // Funnel types chart
    if (analysisData.funnel_types) {
        createChart('funnelTypesChart', 'doughnut', analysisData.funnel_types, 'Funnel Types');
    }
}

// Generic chart creation function
function createChart(canvasId, type, data, label) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    const colors = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    
    new Chart(ctx.getContext('2d'), {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: colors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: type === 'bar' ? 'top' : 'right'
                }
            }
        }
    });
}

// Load video transcripts
async function loadVideoTranscripts() {
    try {
        const response = await fetch('/api/video-transcripts');
        const transcripts = await response.json();
        
        displayVideoTranscripts(transcripts);
    } catch (error) {
        console.error('Error loading video transcripts:', error);
    }
}

// Display video transcripts
function displayVideoTranscripts(transcripts) {
    const videosList = document.getElementById('videosList');
    if (!videosList) return;
    
    videosList.innerHTML = '';
    
    transcripts.slice(0, 20).forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = 'bg-white rounded-lg shadow p-6';
        
        let videoSection = '';
        if (video.videoUrl) {
            videoSection = `
                <video class="w-full h-40 object-cover rounded mb-4 video-player" controls>
                    <source src="${video.videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        }
        
        const adInfo = video.adData ? `
            <div class="mb-3 p-3 bg-indigo-50 rounded">
                <h4 class="font-semibold text-sm mb-2">📢 Ad Info</h4>
                <p class="text-sm text-gray-700"><strong>Title:</strong> ${video.adData.title || 'N/A'}</p>
                <p class="text-sm text-gray-700"><strong>Brand:</strong> ${video.adData.brand || 'N/A'}</p>
                ${video.adData.share_url ? `<a href="${video.adData.share_url}" target="_blank" class="text-xs text-blue-600 hover:underline">🔗 View on Gethookd</a>` : ''}
            </div>
        ` : '';
        
        videoCard.innerHTML = `
            ${videoSection}
            <h3 class="font-semibold text-gray-900 mb-3">${video.id}</h3>
            ${adInfo}
            <div class="bg-gray-50 rounded p-3">
                <h4 class="font-semibold text-sm mb-2">📝 Transcript</h4>
                <div class="text-sm text-gray-700 max-h-32 overflow-y-auto">${video.transcript}</div>
            </div>
            <div class="mt-3 p-3 bg-blue-50 rounded">
                <h4 class="font-semibold text-sm mb-2">💡 Key Insights</h4>
                <p class="text-sm text-gray-600">
                    ${analyzeVideoContent(video.transcript)}
                </p>
            </div>
        `;
        
        videosList.appendChild(videoCard);
    });
}

// Analyze video content for insights
function analyzeVideoContent(transcript) {
    if (transcript.toLowerCase().includes('triple discount') || transcript.toLowerCase().includes('flash sale')) {
        return 'Urgency + Discount Stacking - Classic conversion optimization hook';
    }
    if (transcript.toLowerCase().includes('tap') || transcript.toLowerCase().includes('click')) {
        return 'Direct response CTA - Designed for immediate action';
    }
    if (transcript.toLowerCase().includes('tonight') || transcript.toLowerCase().includes('ends')) {
        return 'Scarcity-based urgency - Time-limited offer psychology';
    }
    return 'Educational/informational content - Trust-building approach';
}

// Load landing pages
async function loadLandingPages() {
    try {
        const response = await fetch('/api/landing-pages');
        const landingPages = await response.json();
        
        displayLandingPages(landingPages);
    } catch (error) {
        console.error('Error loading landing pages:', error);
    }
}

// Display landing pages
function displayLandingPages(landingPages) {
    const landingPagesList = document.getElementById('landingPagesList');
    landingPagesList.innerHTML = '';
    
    landingPages.slice(0, 10).forEach(lp => {
        const lpCard = document.createElement('div');
        lpCard.className = 'bg-gray-50 rounded-lg p-4';
        
        const funnelType = determineFunnelType(lp.url);
        
        lpCard.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-semibold text-gray-900 truncate">${lp.url}</h4>
                <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">${lp.count} ads</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">Brands: ${lp.brands.join(', ')}</p>
            <div class="flex items-center text-sm">
                <span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">${funnelType}</span>
                <a href="${lp.url}" target="_blank" class="ml-2 text-blue-600 hover:underline text-xs">🔗 Visit Page</a>
            </div>
        `;
        
        landingPagesList.appendChild(lpCard);
    });
}

// Determine funnel type from URL
function determineFunnelType(url) {
    if (url.includes('/quiz/') || url.includes('/survey/')) return 'Quiz/Survey Funnel';
    if (url.includes('/vsl/') || url.includes('/video/')) return 'VSL/Advertorial';
    if (url.includes('/sp') || url.includes('/sales-page/')) return 'Direct Sales Page';
    return 'Direct to Product';
}