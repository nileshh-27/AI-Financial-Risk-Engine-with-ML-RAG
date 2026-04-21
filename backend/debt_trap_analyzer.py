"""
ML-Driven Debt Trap Analyzer (Hyper-Local Indian Edition).
Uses a trained Random Forest model to assess financial risk based on synthesized Indian behavioral data.
"""
import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from collections import defaultdict

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "debt_risk_model.joblib")
FEATURES_PATH = os.path.join(os.path.dirname(__file__), "models", "risk_features.joblib")

# Indian Specific Keywords
GAMBLING_KEYWORDS = ['dream11', 'mpl', 'my11circle', 'rummy', 'zupee', 'winzo', 'poker', 'betting']
INSTANT_LOAN_KEYWORDS = ['kreditbee', 'moneytap', 'pocketly', 'cashe', 'mppocket', 'slice', 'uni card', 'dhani']
GOLD_LOAN_KEYWORDS = ['muthoot', 'manappuram', 'gold loan', 'pvt ltd finance', 'interest pay']
CC_CASH_KEYWORDS = ['cash withdrawal', 'atm wdl', 'atm wd']

def _extract_features(transactions: list[dict]) -> pd.DataFrame:
    """
    Extracts the exact feature set required by the Indian-context Random Forest model.
    """
    total_debit = sum(t["amount"] for t in transactions if t.get("type") == "debit")
    total_credit = sum(t["amount"] for t in transactions if t.get("type") == "credit")
    
    # Heuristic for income if no credits found
    income = total_credit if total_credit > 0 else total_debit * 1.2
    
    emi_keywords = ["emi", "loan", "repayment", "bajaj finance", "tata capital", "idfc first"]
    emi_total = sum(t["amount"] for t in transactions if t.get("type") == "debit" and any(kw in t["description"].lower() for kw in emi_keywords))
    
    bnpl_keywords = ["paytm postpaid", "lazypay", "simpl", "pay later", "amazon pay later", "flipkart pay later"]
    bnpl_count = sum(1 for t in transactions if t.get("type") == "debit" and any(kw in t["description"].lower() for kw in bnpl_keywords))
    
    instant_loan_count = sum(1 for t in transactions if t.get("type") == "debit" and any(kw in t["description"].lower() for kw in INSTANT_LOAN_KEYWORDS))
    
    gambling_count = sum(1 for t in transactions if t.get("type") == "debit" and any(kw in t["description"].lower() for kw in GAMBLING_KEYWORDS))
    gambling_index = 0
    if gambling_count > 10: gambling_index = 2
    elif gambling_count > 0: gambling_index = 1
    
    gold_loan_total = sum(t["amount"] for t in transactions if t.get("type") == "debit" and any(kw in t["description"].lower() for kw in GOLD_LOAN_KEYWORDS))
    
    cc_min_keywords = ["credit card min", "minimum payment", "min due", "minimum due"]
    cc_min_payments = sum(1 for t in transactions if t.get("type") == "debit" and any(kw in t["description"].lower() for kw in cc_min_keywords))
    
    cc_cash_wdl = 0
    cc_identifiers = ['credit card', 'ccard', 'cc ']
    for t in transactions:
        desc = t["description"].lower()
        if t.get("type") == "debit" and any(kw in desc for kw in CC_CASH_KEYWORDS):
             if any(cc in desc for cc in cc_identifiers):
                 cc_cash_wdl = 1
                 break

    upi_count = sum(1 for t in transactions if t["description"].startswith("UPI"))
    upi_saliency = upi_count / (upi_count + 50)

    monthly_debits = defaultdict(float)
    for t in transactions:
        if t.get("type") == "debit":
            monthly_debits[t["date"][:7]] += t["amount"]
    
    velocity = 1.0
    if len(monthly_debits) >= 2:
        sorted_months = sorted(monthly_debits.keys())
        last_month = monthly_debits[sorted_months[-1]]
        avg_months = sum(monthly_debits.values()) / len(monthly_debits)
        velocity = last_month / (avg_months + 1)

    features = {
        'monthly_income': income / max(1, len(monthly_debits)),
        'monthly_expenses': total_debit / max(1, len(monthly_debits)),
        'emi_ratio': emi_total / (income + 1),
        'bnpl_frequency': bnpl_count,
        'instant_loan_freq': instant_loan_count,
        'cc_min_payments': cc_min_payments,
        'cc_cash_withdrawal': cc_cash_wdl,
        'upi_saliency': upi_saliency,
        'gambling_index': gambling_index,
        'gold_loan_ratio': gold_loan_total / (income + 1),
        'savings_rate': (income - total_debit) / (income + 1),
        'spending_velocity': velocity,
        'expense_income_ratio': total_debit / (income + 1)
    }
    
    return pd.DataFrame([features])

def analyze_debt_traps(transactions: list[dict]) -> list[dict]:
    if not transactions:
        return []

    try:
        if not os.path.exists(MODEL_PATH):
            return []
            
        model = joblib.load(MODEL_PATH)
        feature_names = joblib.load(FEATURES_PATH)
        
        X = _extract_features(transactions)
        X = X[feature_names]
        
        risk_label = int(model.predict(X)[0])
        probabilities = model.predict_proba(X)[0]
        
        risk_levels = ["low", "medium", "high", "critical"]
        severity = risk_levels[risk_label]
        
        results = []
        drivers = []
        feats = X.iloc[0].to_dict()
        
        if feats['gambling_index'] >= 1: drivers.append("High Gambling/Betting app activity (Dream11, Rummy, etc.)")
        if feats['cc_cash_withdrawal'] > 0: drivers.append("Critical Risk: ATM Cash Withdrawal on Credit Card")
        if feats['instant_loan_freq'] > 2: drivers.append("High reliance on Instant Loan apps (KreditBee, slice, etc.)")
        if feats['emi_ratio'] > 0.4: drivers.append("High EMI burden")
        if feats['cc_min_payments'] >= 2: drivers.append("Frequent Credit Card Minimum payments")
        if feats['expense_income_ratio'] > 1.05: drivers.append("Monthly spending exceeding income")
        if feats['gold_loan_ratio'] > 0.15: drivers.append("Significant Gold Loan servicing detected")
        if feats['upi_saliency'] > 0.35: drivers.append("Impulsive micro-spending via UPI")

        if risk_label > 0:
            titles = ["Moderate Financial Risk", "High Debt Risk", "Critical Financial Distress"]
            descriptions = [
                "Your spending patterns show early signs of lifestyle inflation or debt dependency.",
                "Significant risk of a debt trap detected. Multiple high-interest obligations identified.",
                "Immediate financial intervention required. Debts are outpacing income significantly."
            ]
            
            driver_str = " Key signals identified: " + ", ".join(drivers) if drivers else ""
            
            results.append({
                "type": "ml_risk_assessment",
                "severity": severity,
                "title": titles[risk_label-1],
                "description": f"{descriptions[risk_label-1]}{driver_str}",
                "recommendation": "Stop all non-essential spending. Prioritize Credit Card & Instant Loan repayments immediately. Consider a debt restructuring plan.",
                "metric": round(float(np.max(probabilities)) * 100, 1)
            })
        elif drivers:
            results.append({
                "type": "preemptive_warning",
                "severity": "low",
                "title": "Minor Financial Warnings",
                "description": "Overall risk is low, but be cautious of: " + ", ".join(drivers),
                "recommendation": "Monitor your micro-spending habits to maintain your low risk status.",
                "metric": round(float(np.max(probabilities)) * 100, 1)
            })
            
        return results

    except Exception as e:
        print(f"ML Analysis Error: {e}")
        return []
