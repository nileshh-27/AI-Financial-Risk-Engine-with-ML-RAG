"""
Recurring payment detector.
Identifies autopays, subscriptions, and periodic mandatory payments.
"""
from collections import defaultdict
from datetime import datetime, timedelta
import re


def _days_between(d1: str, d2: str) -> int:
    dt1 = datetime.strptime(d1, "%Y-%m-%d")
    dt2 = datetime.strptime(d2, "%Y-%m-%d")
    return abs((dt2 - dt1).days)


def _normalize_merchant(desc: str) -> str:
    desc = desc.upper().strip()
    desc = re.sub(r'\s*(UPI|NEFT|IMPS|RTGS|AUTOPAY|MANDATE|DEBIT|CREDIT|PAYMENT)\s*$', '', desc)
    desc = re.sub(r'\s*(UPI|NEFT|IMPS|RTGS|AUTOPAY|MANDATE)\s*', ' ', desc)
    desc = re.sub(r'\b[A-Z0-9]{10,}\b', '', desc)
    desc = re.sub(r'\s+', ' ', desc).strip()
    return desc


def _detect_frequency(intervals: list[int]) -> dict | None:
    if len(intervals) < 2:
        return None
    avg = sum(intervals) / len(intervals)
    std = (sum((x - avg) ** 2 for x in intervals) / len(intervals)) ** 0.5
    if 5 <= avg <= 10 and std < 3:
        return {"type": "weekly", "avg_days": avg, "confidence": round(1 - std / avg, 2)}
    if 12 <= avg <= 18 and std < 4:
        return {"type": "bi-weekly", "avg_days": avg, "confidence": round(1 - std / avg, 2)}
    if 25 <= avg <= 38 and std < 8:
        return {"type": "monthly", "avg_days": avg, "confidence": round(1 - std / avg, 2)}
    if 80 <= avg <= 100 and std < 15:
        return {"type": "quarterly", "avg_days": avg, "confidence": round(1 - std / avg, 2)}
    if 160 <= avg <= 200 and std < 25:
        return {"type": "semi-annual", "avg_days": avg, "confidence": round(1 - std / avg, 2)}
    if 340 <= avg <= 390 and std < 30:
        return {"type": "annual", "avg_days": avg, "confidence": round(1 - std / avg, 2)}
    return None


def _predict_next_date(last_date: str, avg_days: float) -> str:
    dt = datetime.strptime(last_date, "%Y-%m-%d")
    next_dt = dt + timedelta(days=int(avg_days))
    return next_dt.strftime("%Y-%m-%d")


def _amount_similarity(amounts: list[float]) -> float:
    if len(amounts) < 2:
        return 1.0
    avg = sum(amounts) / len(amounts)
    if avg == 0:
        return 0.0
    max_deviation = max(abs(a - avg) / avg for a in amounts)
    return round(max(0, 1 - max_deviation), 3)


def detect_recurring(transactions: list[dict], min_occurrences: int = 3) -> list[dict]:
    merchant_groups = defaultdict(list)
    for txn in transactions:
        if txn.get("type") != "debit":
            continue
        key = _normalize_merchant(txn["description"])
        if len(key) < 3:
            continue
        merchant_groups[key].append(txn)

    recurring = []
    for merchant, txns in merchant_groups.items():
        if len(txns) < min_occurrences:
            continue
        txns.sort(key=lambda x: x["date"])
        dates = [t["date"] for t in txns]
        amounts = [t["amount"] for t in txns]
        intervals = []
        for i in range(1, len(dates)):
            interval = _days_between(dates[i - 1], dates[i])
            if interval > 0:
                intervals.append(interval)
        if not intervals:
            continue
        freq = _detect_frequency(intervals)
        if not freq:
            continue
        amt_sim = _amount_similarity(amounts)
        is_autopay = any(
            kw in txns[0]["description"].lower()
            for kw in ["autopay", "mandate", "auto debit", "standing instruction", "si/"]
        )
        avg_amount = round(sum(amounts) / len(amounts), 2)
        if freq["type"] == "weekly":
            monthly_cost = avg_amount * 4.33
        elif freq["type"] == "bi-weekly":
            monthly_cost = avg_amount * 2.17
        elif freq["type"] == "monthly":
            monthly_cost = avg_amount
        elif freq["type"] == "quarterly":
            monthly_cost = avg_amount / 3
        elif freq["type"] == "semi-annual":
            monthly_cost = avg_amount / 6
        elif freq["type"] == "annual":
            monthly_cost = avg_amount / 12
        else:
            monthly_cost = avg_amount
        recurring.append({
            "merchant": merchant.title(),
            "category": txns[0].get("category"),
            "amount_avg": avg_amount,
            "amount_range": {"min": min(amounts), "max": max(amounts)},
            "frequency": freq,
            "occurrences": len(txns),
            "last_date": dates[-1],
            "next_expected": _predict_next_date(dates[-1], freq["avg_days"]),
            "amount_consistency": amt_sim,
            "is_autopay": is_autopay,
            "monthly_cost": round(monthly_cost, 2),
            "annual_cost": round(monthly_cost * 12, 2),
            "dates": dates,
        })
    recurring.sort(key=lambda x: x["annual_cost"], reverse=True)
    return recurring
