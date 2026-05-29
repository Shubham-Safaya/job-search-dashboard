// ========================================
// Job Search Analytics Dashboard
// ========================================

const GEOJSON_URL = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';
const DATA_URL = 'data/dashboard_data.json';

// State abbreviation to full name mapping
const STATE_NAMES = {
    AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
    CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
    HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
    KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
    MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
    MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
    NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
    OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
    SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
    VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
    DC:'District of Columbia'
};

// Reverse mapping: full name -> abbreviation
const STATE_ABBREVS = {};
for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    STATE_ABBREVS[name] = abbr;
}

// Chart.js global config
Chart.defaults.color = '#8899b0';
Chart.defaults.borderColor = 'rgba(42, 58, 80, 0.5)';
Chart.defaults.font.family = "'Inter', sans-serif";

// Color palettes
const TIER_COLORS = {
    1: '#3b82f6',
    2: '#8b5cf6',
    3: '#06b6d4'
};

const SOURCE_COLORS = {
    greenhouse: '#10b981',
    lever: '#8b5cf6',
    linkedin: '#3b82f6',
    indeed: '#f59e0b',
    wellfound: '#ec4899'
};

const DOMAIN_COLORS = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#ef4444'
};

// ----------------------------------------
// Data Loading
// ----------------------------------------
async function loadData() {
    try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('Failed to load dashboard data:', err);
        document.querySelector('main').innerHTML =
            '<div class="loading" style="min-height:60vh;">Unable to load dashboard data. Ensure data/dashboard_data.json exists.</div>';
        return null;
    }
}

// ----------------------------------------
// Summary Cards
// ----------------------------------------
function renderSummary(data) {
    const animate = (el, target) => {
        el.classList.add('animate-number');
        const isFloat = String(target).includes('.');
        const duration = 800;
        const start = performance.now();
        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * target;
            el.textContent = isFloat ? current.toFixed(1) : Math.round(current).toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    animate(document.getElementById('totalJobsToday'), data.summary.total_jobs_today);
    animate(document.getElementById('totalApplications'), data.summary.total_applications);
    animate(document.getElementById('uniqueCompanies'), data.summary.unique_companies);
    animate(document.getElementById('avgDomainScore'), data.summary.avg_domain_score);
    animate(document.getElementById('daysActive'), data.days_active);

    // Last updated
    const updated = new Date(data.last_updated);
    document.getElementById('lastUpdated').textContent =
        `Updated ${updated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${updated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

// ----------------------------------------
// US Map Heatmap
// ----------------------------------------
async function renderMap(jobsByState) {
    const map = L.map('map', {
        center: [39.5, -98.5],
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Fetch GeoJSON
    let geojson;
    try {
        const res = await fetch(GEOJSON_URL);
        geojson = await res.json();
    } catch {
        console.error('Failed to load US states GeoJSON');
        return;
    }

    const maxJobs = Math.max(...Object.values(jobsByState));

    function getColor(count) {
        if (!count || count === 0) return 'rgba(42, 58, 80, 0.3)';
        const ratio = count / maxJobs;
        if (ratio > 0.7) return '#0ea5e9';
        if (ratio > 0.5) return '#38bdf8';
        if (ratio > 0.3) return '#7dd3fc';
        if (ratio > 0.15) return '#bae6fd';
        return '#e0f2fe';
    }

    function style(feature) {
        const stateName = feature.properties.name;
        const abbr = STATE_ABBREVS[stateName];
        const count = abbr ? (jobsByState[abbr] || 0) : 0;
        return {
            fillColor: getColor(count),
            weight: 1,
            opacity: 0.8,
            color: '#1e3a5f',
            fillOpacity: 0.75
        };
    }

    function onEachFeature(feature, layer) {
        const stateName = feature.properties.name;
        const abbr = STATE_ABBREVS[stateName];
        const count = abbr ? (jobsByState[abbr] || 0) : 0;
        layer.bindTooltip(
            `<div class="state-tooltip"><span class="tooltip-name">${stateName}</span><br><span class="tooltip-count">${count}</span> jobs</div>`,
            { className: 'state-tooltip', sticky: true }
        );
        layer.on({
            mouseover: (e) => {
                e.target.setStyle({ weight: 2, color: '#06b6d4', fillOpacity: 0.9 });
            },
            mouseout: (e) => {
                geoLayer.resetStyle(e.target);
            }
        });
    }

    const geoLayer = L.geoJSON(geojson, { style, onEachFeature }).addTo(map);

    // Legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <div class="legend-title">Job Count</div>
            <i style="background:#0ea5e9"></i> 30+<br>
            <i style="background:#38bdf8"></i> 20-30<br>
            <i style="background:#7dd3fc"></i> 10-20<br>
            <i style="background:#bae6fd"></i> 5-10<br>
            <i style="background:#e0f2fe"></i> 1-5<br>
            <i style="background:rgba(42,58,80,0.3)"></i> 0
        `;
        return div;
    };
    legend.addTo(map);
}

// ----------------------------------------
// Company Bar Chart
// ----------------------------------------
function renderCompanyChart(companies) {
    const ctx = document.getElementById('companyChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: companies.map(c => c.company),
            datasets: [{
                data: companies.map(c => c.count),
                backgroundColor: companies.map(c => TIER_COLORS[c.tier] || '#06b6d4'),
                borderRadius: 4,
                borderSkipped: false,
                barThickness: 14
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a2332',
                    borderColor: '#2a3a50',
                    borderWidth: 1,
                    titleColor: '#e8edf5',
                    bodyColor: '#8899b0',
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => `${ctx.raw} jobs`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(42, 58, 80, 0.3)' },
                    ticks: { font: { size: 11 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: 500 } }
                }
            }
        }
    });
}

// ----------------------------------------
// Domain Relevance Donut
// ----------------------------------------
function renderDomainChart(distribution) {
    const ctx = document.getElementById('domainChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['High (>20)', 'Medium (10-20)', 'Low (<10)'],
            datasets: [{
                data: [distribution.high, distribution.medium, distribution.low],
                backgroundColor: [DOMAIN_COLORS.high, DOMAIN_COLORS.medium, DOMAIN_COLORS.low],
                borderColor: '#1a2332',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1a2332',
                    borderColor: '#2a3a50',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.raw / total) * 100).toFixed(1);
                            return `${ctx.raw} jobs (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ----------------------------------------
// Source Pie Chart
// ----------------------------------------
function renderSourceChart(sources) {
    const ctx = document.getElementById('sourceChart').getContext('2d');
    const labels = Object.keys(sources).map(s => s.charAt(0).toUpperCase() + s.slice(1));
    const values = Object.values(sources);
    const colors = Object.keys(sources).map(s => SOURCE_COLORS[s] || '#6b7280');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: '#1a2332',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 14,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1a2332',
                    borderColor: '#2a3a50',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.raw / total) * 100).toFixed(1);
                            return `${ctx.raw} jobs (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ----------------------------------------
// Daily Trend Line Chart
// ----------------------------------------
function renderTrendChart(trend) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const labels = trend.map(d => {
        const date = new Date(d.date + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Jobs Found',
                data: trend.map(d => d.jobs_found),
                borderColor: '#06b6d4',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#06b6d4',
                pointHoverBorderColor: '#1a2332',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a2332',
                    borderColor: '#2a3a50',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => `${ctx.raw} jobs found`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 10 },
                        maxTicksLimit: 10
                    }
                },
                y: {
                    grid: { color: 'rgba(42, 58, 80, 0.3)' },
                    ticks: { font: { size: 11 } },
                    beginAtZero: false
                }
            }
        }
    });
}

// ----------------------------------------
// Top Cities Bar Chart
// ----------------------------------------
function renderCityChart(cities) {
    const ctx = document.getElementById('cityChart').getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#06b6d4');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cities.map(c => c.city),
            datasets: [{
                data: cities.map(c => c.count),
                backgroundColor: gradient,
                borderRadius: 4,
                borderSkipped: false,
                barThickness: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a2332',
                    borderColor: '#2a3a50',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => `${ctx.raw} jobs`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 30
                    }
                },
                y: {
                    grid: { color: 'rgba(42, 58, 80, 0.3)' },
                    ticks: { font: { size: 11 } },
                    beginAtZero: true
                }
            }
        }
    });
}

// ----------------------------------------
// Top Matches Table
// ----------------------------------------
function renderTable(matches) {
    const tbody = document.getElementById('matchesBody');
    tbody.innerHTML = '';

    matches.forEach(job => {
        const tr = document.createElement('tr');
        tr.onclick = () => window.open(job.url, '_blank');

        const scoreClass = job.domain_score > 20 ? 'score-high' :
                          job.domain_score >= 10 ? 'score-medium' : 'score-low';
        const sourceClass = `source-${job.source}`;

        tr.innerHTML = `
            <td><strong>${escapeHtml(job.company)}</strong></td>
            <td>${escapeHtml(job.title)}</td>
            <td>${escapeHtml(job.location)}</td>
            <td><span class="source-badge ${sourceClass}">${escapeHtml(job.source)}</span></td>
            <td><span class="score-badge ${scoreClass}">${job.domain_score}</span></td>
            <td>${escapeHtml(job.salary_range || '--')}</td>
            <td>${formatDate(job.date_found)}</td>
        `;
        tbody.appendChild(tr);
    });

    // Sortable headers
    setupTableSorting(matches);
}

function setupTableSorting(matches) {
    const headers = document.querySelectorAll('#matchesTable th[data-sort]');
    let currentSort = { key: 'domain_score', dir: 'desc' };

    headers.forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            const dir = currentSort.key === key && currentSort.dir === 'desc' ? 'asc' : 'desc';
            currentSort = { key, dir };

            headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
            th.classList.add(dir === 'asc' ? 'sorted-asc' : 'sorted-desc');

            const sorted = [...matches].sort((a, b) => {
                let va = a[key], vb = b[key];
                if (typeof va === 'string') va = va.toLowerCase();
                if (typeof vb === 'string') vb = vb.toLowerCase();
                if (va < vb) return dir === 'asc' ? -1 : 1;
                if (va > vb) return dir === 'asc' ? 1 : -1;
                return 0;
            });

            renderTable(sorted);
            // Re-apply sort indicator
            const newTh = document.querySelector(`#matchesTable th[data-sort="${key}"]`);
            if (newTh) newTh.classList.add(dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
        });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ----------------------------------------
// Initialize
// ----------------------------------------
async function init() {
    const data = await loadData();
    if (!data) return;

    renderSummary(data);
    renderMap(data.jobs_by_state);
    renderCompanyChart(data.jobs_by_company);
    renderDomainChart(data.domain_score_distribution);
    renderSourceChart(data.jobs_by_source);
    renderTrendChart(data.daily_trend);
    renderCityChart(data.top_cities);
    renderTable(data.top_matches);
}

document.addEventListener('DOMContentLoaded', init);
