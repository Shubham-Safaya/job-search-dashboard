# Job Search Analytics Dashboard

Interactive analytics dashboard for an automated job search pipeline that scrapes 50+ companies daily across Greenhouse, Lever, LinkedIn, Indeed, and Wellfound.

## Features

- **US Map Heatmap** — Choropleth visualization of job density by state using Leaflet.js
- **Summary Cards** — Real-time metrics: jobs found, applications submitted, companies tracked
- **Charts** — Company rankings, domain relevance distribution, source breakdown, daily trends, top cities
- **Sortable Table** — Top job matches ranked by domain relevance score
- **Dark Theme** — Professional design, fully responsive

## Tech Stack

- Pure static site (HTML + CSS + JS)
- [Chart.js](https://www.chartjs.org/) for charts
- [Leaflet.js](https://leafletjs.com/) for the interactive map
- No API keys or build step required

## Data

The dashboard reads from `data/dashboard_data.json`, which is generated daily by the [job search pipeline](https://github.com/Shubham-Safaya/job-search-pipeline) via GitHub Actions.

## Live

[https://shubham-safaya.github.io/job-search-dashboard/](https://shubham-safaya.github.io/job-search-dashboard/)

---

Built by Shubham Safaya | PM + Engineer
