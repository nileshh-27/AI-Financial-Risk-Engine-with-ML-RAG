"""
Fiscal year spending predictor.
Uses weighted linear regression with seasonal decomposition.
Indian fiscal year: April to March.
"""
from collections import defaultdict
from datetime import datetime
import math


def _get_fy(date_str: str) -> str:
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    year = dt.year
    if dt.month >= 4:
        return f"FY{year}-{year + 1}"
    else:
        return f"FY{year - 1}-{year}"


def _fy_month_index(date_str: str) -> int:
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return (dt.month - 4) % 12


def _weighted_avg(values: list[float], recent_weight: float = 2.0) -> float:
    if not values:
        return 0
    n = len(values)
    weights = [1 + (recent_weight - 1) * (i / max(1, n - 1)) for i in range(n)]
    total_weight = sum(weights)
    weighted_sum = sum(v * w for v, w in zip(values, weights))
    return weighted_sum / total_weight


def _linear_trend(values: list[float]) -> tuple[float, float]:
    n = len(values)
    if n < 2:
        return (values[0] if values else 0, 0)
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    den = sum((i - x_mean) ** 2 for i in range(n))
    slope = num / den if den != 0 else 0
    intercept = y_mean - slope * x_mean
    return (intercept, slope)


def predict_next_fy(transactions: list[dict]) -> dict:
    if not transactions:
        return _empty_prediction()

    debits = [t for t in transactions if t.get("type") == "debit"]
    if not debits:
        return _empty_prediction()

    fy_cat_monthly = defaultdict(lambda: defaultdict(lambda: [0.0] * 12))
    fy_monthly = defaultdict(lambda: [0.0] * 12)

    for txn in debits:
        fy = _get_fy(txn["date"])
        month_idx = _fy_month_index(txn["date"])
        category = txn.get("category", "Miscellaneous")
        fy_cat_monthly[fy][category][month_idx] += txn["amount"]
        fy_monthly[fy][month_idx] += txn["amount"]

    fys_sorted = sorted(fy_cat_monthly.keys())
    if not fys_sorted:
        return _empty_prediction()

    current_fy = fys_sorted[-1]
    parts = current_fy.replace("FY", "").split("-")
    next_fy_start = int(parts[1])
    predicted_fy = f"FY{next_fy_start}-{next_fy_start + 1}"

    all_categories = set()
    for fy in fys_sorted:
        all_categories.update(fy_cat_monthly[fy].keys())

    category_predictions = []
    for category in sorted(all_categories):
        fy_totals = []
        fy_monthly_data = []
        for fy in fys_sorted:
            monthly = fy_cat_monthly[fy].get(category, [0.0] * 12)
            fy_totals.append(sum(monthly))
            fy_monthly_data.append(monthly)

        current_total = fy_totals[-1] if fy_totals else 0
        if len(fy_totals) >= 2:
            intercept, slope = _linear_trend(fy_totals)
            base = intercept + slope * len(fy_totals)
            predicted_total = max(0, base)
        else:
            predicted_total = current_total * 1.05

        predicted_monthly = [0.0] * 12
        for month_idx in range(12):
            month_values = [fm[month_idx] for fm in fy_monthly_data if fm[month_idx] > 0]
            if month_values:
                predicted_monthly[month_idx] = round(_weighted_avg(month_values), 2)

        monthly_sum = sum(predicted_monthly)
        if monthly_sum > 0 and predicted_total > 0:
            scale = predicted_total / monthly_sum
            predicted_monthly = [round(m * scale, 2) for m in predicted_monthly]

        if current_total > 0:
            change_pct = round(((predicted_total - current_total) / current_total) * 100, 1)
        else:
            change_pct = 0

        trend = "stable"
        if change_pct > 5:
            trend = "increasing"
        elif change_pct < -5:
            trend = "decreasing"

        confidence = min(0.95, 0.5 + 0.15 * len(fys_sorted))

        category_predictions.append({
            "category": category,
            "current_fy_total": round(current_total, 2),
            "predicted_total": round(predicted_total, 2),
            "change_pct": change_pct,
            "trend": trend,
            "monthly_breakdown": predicted_monthly,
            "confidence": round(confidence, 2),
        })

    category_predictions.sort(key=lambda x: x["predicted_total"], reverse=True)

    total_predicted = sum(cp["predicted_total"] for cp in category_predictions)

    current_monthly = fy_monthly.get(current_fy, [0.0] * 12)
    predicted_monthly_totals = [0.0] * 12
    for cp in category_predictions:
        for i in range(12):
            predicted_monthly_totals[i] += cp["monthly_breakdown"][i]

    insights = _generate_insights(category_predictions, current_fy, predicted_fy)
    months_of_data = sum(1 for m in current_monthly if m > 0)

    reliability = "low"
    if len(fys_sorted) >= 3:
        reliability = "high"
    elif len(fys_sorted) >= 2:
        reliability = "moderate"

    return {
        "current_fy": current_fy,
        "predicted_fy": predicted_fy,
        "total_predicted": round(total_predicted, 2),
        "category_predictions": category_predictions,
        "monthly_totals": {
            "current": [round(v, 2) for v in current_monthly],
            "predicted": [round(v, 2) for v in predicted_monthly_totals],
        },
        "insights": insights,
        "data_quality": {
            "fiscal_years_covered": len(fys_sorted),
            "total_transactions": len(debits),
            "months_of_data": months_of_data,
            "reliability": reliability,
        },
    }


def _generate_insights(predictions: list[dict], current_fy: str, predicted_fy: str) -> list[str]:
    insights = []
    increasing = [p for p in predictions if p["trend"] == "increasing"]
    decreasing = [p for p in predictions if p["trend"] == "decreasing"]

    if increasing:
        top = sorted(increasing, key=lambda x: x["change_pct"], reverse=True)[:3]
        cats = ", ".join(f"{p['category']} (+{p['change_pct']}%)" for p in top)
        insights.append(f"📈 Categories with rising spending: {cats}")

    if decreasing:
        top = sorted(decreasing, key=lambda x: x["change_pct"])[:3]
        cats = ", ".join(f"{p['category']} ({p['change_pct']}%)" for p in top)
        insights.append(f"📉 Categories with reduced spending: {cats}")

    if predictions:
        top_cat = predictions[0]
        insights.append(f"💰 Highest predicted category: {top_cat['category']} at ₹{top_cat['predicted_total']:,.0f}")

    total = sum(p["predicted_total"] for p in predictions)
    if total > 0:
        insights.append(f"📊 Total predicted spending for {predicted_fy}: ₹{total:,.0f}")

    return insights


def _empty_prediction() -> dict:
    return {
        "current_fy": "N/A",
        "predicted_fy": "N/A",
        "total_predicted": 0,
        "category_predictions": [],
        "monthly_totals": {"current": [0] * 12, "predicted": [0] * 12},
        "insights": ["Insufficient data for prediction. Upload more bank statements."],
        "data_quality": {
            "fiscal_years_covered": 0,
            "total_transactions": 0,
            "months_of_data": 0,
            "reliability": "none",
        },
    }
