#!/usr/bin/env python3
"""Archive today's dashboard_data.json into data/history/ + rebuild manifest.
Extracts just the trend-relevant slice to keep snapshots small."""
import json, datetime, glob, os
today = datetime.date.today().isoformat()
d = json.load(open("data/dashboard_data.json"))
slim = {
    "date": today,
    "total_jobs_today": (d.get("summary") or {}).get("total_jobs_today"),
    "jobs_by_source": d.get("jobs_by_source", {}),
    "unique_companies": (d.get("summary") or {}).get("unique_companies"),
    "avg_domain_score": (d.get("summary") or {}).get("avg_domain_score"),
    # status funnel if the pipeline starts emitting it (6a data-model, private side)
    "funnel_by_source": d.get("funnel_by_source"),
    "status_counts": d.get("status_counts"),
}
os.makedirs("data/history", exist_ok=True)
json.dump(slim, open(f"data/history/{today}.json", "w"), indent=2)
# manifest for the frontend (no directory listing on Pages)
dates = sorted(os.path.basename(f)[:-5] for f in glob.glob("data/history/*.json")
               if os.path.basename(f) != "index.json")
json.dump({"dates": dates}, open("data/history/index.json", "w"), indent=2)
print(f"snapshot {today}; {len(dates)} days archived")
