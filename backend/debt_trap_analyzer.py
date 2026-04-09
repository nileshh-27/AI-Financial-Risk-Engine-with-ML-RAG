"""
Debt trap analyzer.
Detects patterns that indicate financial distress or risky spending habits.
"""
from collections import defaultdict
from datetime import datetime


def _monthly_totals(transactions: list[dict], txn_type: str = "debit") -> dict[str, float]:
    monthly = defaultdict(float)
    for txn in transactions:
        if txn.get("type") != txn_type:
            continue
        date = txn["date"][:7]
        monthly[date] += txn["amount"]
    return dict(monthly)


def _check_high_emi_burden(transactions: list[dict]) -> dict | None:
    total_debit = sum(t["amount"] for t in transactions if t.get("type") == "debit")
    total_credit = sum(t["amount"] for t in transactions if t.get("type") == "credit")
    emi_keywords = ["emi", "loan", "repayment", "bajaj finance", "tata capital", "idfc first"]
    emi_total = sum(
        t["amount"] for t in transactions
        if t.get("type") == "debit" and any(kw in t["description"].lower() for kw in emi_keywords)
    )
    income = total_credit if total_credit > 0 else total_debit * 1.3
    if income == 0:
        return None
    ratio = emi_total / income
    if ratio > 0.40:
        severity = "critical" if ratio > 0.60 else "high"
        return {
            "type": "high_emi_burden",
            "severity": severity,
            "title": "High EMI/Loan Burden",
            "description": f"Your EMI and loan payments consume {ratio * 100:.1f}% of your income. Ideally this should be below 40%.",
            "recommendation": "Consider consolidating loans or refinancing at a lower interest rate. Avoid taking new loans.",
            "metric": round(ratio * 100, 1),
        }
    return None


def _check_bnpl_overuse(transactions: list[dict]) -> dict | None:
    bnpl_keywords = ["paytm postpaid", "lazypay", "simpl", "pay later", "amazon pay later", "flipkart pay later"]
    bnpl_txns = [t for t in transactions if t.get("type") == "debit" and any(kw in t["description"].lower() for kw in bnpl_keywords)]
    total_debit = sum(t["amount"] for t in transactions if t.get("type") == "debit")
    bnpl_total = sum(t["amount"] for t in bnpl_txns)
    if total_debit == 0:
        return None
    ratio = bnpl_total / total_debit
    if len(bnpl_txns) > 10 or ratio > 0.15:
        severity = "high" if ratio > 0.25 else "medium"
        return {
            "type": "bnpl_overuse",
            "severity": severity,
            "title": "Buy Now Pay Later Overuse",
            "description": f"You've made {len(bnpl_txns)} BNPL transactions totaling ₹{bnpl_total:,.0f} ({ratio * 100:.1f}% of spending). Excessive BNPL usage can lead to debt cycles.",
            "recommendation": "Limit BNPL purchases and try to pay upfront. Hidden charges and late fees can accumulate quickly.",
            "metric": round(ratio * 100, 1),
        }
    return None


def _check_credit_card_minimum(transactions: list[dict]) -> dict | None:
    cc_min_keywords = ["credit card min", "minimum payment", "min due", "minimum due"]
    cc_min_txns = [t for t in transactions if t.get("type") == "debit" and any(kw in t["description"].lower() for kw in cc_min_keywords)]
    if len(cc_min_txns) >= 3:
        return {
            "type": "cc_minimum_payments",
            "severity": "high",
            "title": "Credit Card Minimum-Only Payments",
            "description": f"You've made {len(cc_min_txns)} minimum payment(s) on credit cards. Paying only the minimum incurs ~36-42% annual interest in India.",
            "recommendation": "Always try to pay the full credit card bill. Minimum payments lead to compounding debt that can take years to clear.",
            "metric": len(cc_min_txns),
        }
    return None


def _check_spending_exceeds_income(transactions: list[dict]) -> dict | None:
    total_debit = sum(t["amount"] for t in transactions if t.get("type") == "debit")
    total_credit = sum(t["amount"] for t in transactions if t.get("type") == "credit")
    if total_credit == 0:
        return None
    ratio = total_debit / total_credit
    if ratio > 1.1:
        severity = "critical" if ratio > 1.3 else "high"
        return {
            "type": "spending_exceeds_income",
            "severity": severity,
            "title": "Spending Exceeds Income",
            "description": f"Your total debits (₹{total_debit:,.0f}) exceed credits (₹{total_credit:,.0f}) by {(ratio - 1) * 100:.1f}%. You are spending more than you earn.",
            "recommendation": "Review and reduce discretionary spending immediately. Create a strict monthly budget.",
            "metric": round(ratio * 100, 1),
        }
    return None


def _check_rising_spending_trend(transactions: list[dict]) -> dict | None:
    monthly = _monthly_totals(transactions, "debit")
    if len(monthly) < 4:
        return None
    months = sorted(monthly.keys())
    mid = len(months) // 2
    first_half_avg = sum(monthly[m] for m in months[:mid]) / mid
    second_half_avg = sum(monthly[m] for m in months[mid:]) / (len(months) - mid)
    if first_half_avg == 0:
        return None
    growth = (second_half_avg - first_half_avg) / first_half_avg
    if growth > 0.25:
        severity = "high" if growth > 0.40 else "medium"
        return {
            "type": "rising_spending_trend",
            "severity": severity,
            "title": "Rising Spending Trend",
            "description": f"Your spending has increased by {growth * 100:.0f}% in the recent period compared to earlier months.",
            "recommendation": "Identify the categories driving the increase and set spending limits.",
            "metric": round(growth * 100, 1),
        }
    return None


def _check_low_savings_rate(transactions: list[dict]) -> dict | None:
    total_credit = sum(t["amount"] for t in transactions if t.get("type") == "credit")
    total_debit = sum(t["amount"] for t in transactions if t.get("type") == "debit")
    if total_credit == 0:
        return None
    savings_rate = (total_credit - total_debit) / total_credit
    if savings_rate < 0.10:
        severity = "medium" if savings_rate > 0 else "high"
        return {
            "type": "low_savings_rate",
            "severity": severity,
            "title": "Low Savings Rate",
            "description": f"Your savings rate is only {savings_rate * 100:.1f}%. Financial advisors recommend saving at least 20% of income.",
            "recommendation": "Automate savings via SIP or recurring deposits. Aim for 20% savings rate.",
            "metric": round(savings_rate * 100, 1),
        }
    return None


def analyze_debt_traps(transactions: list[dict]) -> list[dict]:
    checks = [
        _check_high_emi_burden,
        _check_bnpl_overuse,
        _check_credit_card_minimum,
        _check_spending_exceeds_income,
        _check_rising_spending_trend,
        _check_low_savings_rate,
    ]
    results = []
    for check in checks:
        try:
            result = check(transactions)
            if result:
                results.append(result)
        except Exception:
            continue
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    results.sort(key=lambda x: severity_order.get(x["severity"], 99))
    return results
