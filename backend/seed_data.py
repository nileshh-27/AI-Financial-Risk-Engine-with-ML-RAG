"""
Generate synthetic Indian transaction training data for the categorization model.
Run: python seed_data.py
Output: data/training_transactions.csv
"""
import csv, os, random
from datetime import datetime, timedelta

CATEGORIES = {
    "Groceries": [
        "SURYA KIRANA STORE", "RADHIKA KIRANA", "BALAJI GENERAL STORE",
        "LAKSHMI PROVISIONS", "SAI KIRANA MART", "DMART ONLINE", "JIOMART",
        "BIGBASKET", "BLINKIT", "ZEPTO", "MORE MEGASTORE", "RELIANCE FRESH",
        "SPENCERS DAILY", "STAR BAZAAR", "NILGIRIS", "NATURE BASKET",
        "COUNTRY DELIGHT", "MILKBASKET"
    ],
    "Subscriptions": [
        "TRUECALLER SUBSCRIPTION", "NETFLIX INDIA", "AMAZON PRIME",
        "HOTSTAR VIP", "SPOTIFY PREMIUM", "YOUTUBE PREMIUM", "LINKEDIN PREMIUM",
        "APPLE STORAGE", "GOOGLE ONE", "ADOBE CREATIVE CLOUD",
        "MICROSOFT 365", "ZOOM PRO", "CANVA PRO", "NOTION PLUS",
        "JIOCINEMA PREMIUM", "SONYLIV PREMIUM", "ZEE5 PREMIUM",
        "CRED MINT", "AUDIBLE INDIA"
    ],
    "Utilities": [
        "TSSPDCL ELECTRICITY", "APSPDCL BILL", "BESCOM PAYMENT",
        "HMWSSB WATER BILL", "GAS CYLINDER INDANE", "HP GAS PAYMENT",
        "BHARATGAS REFILL", "HPCL PETROL", "IOCL FUEL",
        "JIO FIBER RECHARGE", "AIRTEL BROADBAND", "ACT FIBERNET",
        "BSNL PAYMENT", "AIRTEL MOBILE RECHARGE", "JIO RECHARGE",
        "VI RECHARGE", "BSNL RECHARGE", "TATA PLAY DTH", "D2H RECHARGE"
    ],
    "Education": [
        "UNIVERSITY TUITION FEE", "COLLEGE FEE PAYMENT", "SRM TUITION",
        "VIT VELLORE FEE", "BITS PILANI FEE", "MANIPAL UNIVERSITY FEE",
        "AMRITA UNIVERSITY FEE", "HOSTEL FEE PAYMENT", "EXAM FEE PAYMENT",
        "UNACADEMY SUBSCRIPTION", "BYJUS PAYMENT", "UDEMY COURSE",
        "COURSERA PLUS", "BOOK DEPOT PURCHASE", "SAPIENT BOOKS",
        "SCHOLASTIC INDIA", "CAMBRIDGE PRESS"
    ],
    "Food & Dining": [
        "SWIGGY ORDER", "ZOMATO ORDER", "DOMINOS PIZZA", "PIZZA HUT",
        "KFC INDIA", "MCDONALDS", "BURGER KING", "SUBWAY",
        "STARBUCKS INDIA", "CAFE COFFEE DAY", "CHAI POINT",
        "PARADISE BIRYANI", "HALDIRAMS", "BARBEQUE NATION",
        "MAINLAND CHINA", "BIRYANI BLUES", "FAASOS", "BOX8",
        "EATFIT ORDER", "DUNZO DELIVERY"
    ],
    "Shopping": [
        "AMAZON INDIA", "FLIPKART", "MYNTRA", "AJIO", "NYKAA",
        "MEESHO", "TATA CLIQ", "SNAPDEAL", "SHOPCLUES",
        "RELIANCE DIGITAL", "CROMA STORE", "VIJAY SALES",
        "PANTALOONS", "LIFESTYLE STORE", "MAX FASHION", "WESTSIDE",
        "DECATHLON INDIA", "IKEA INDIA", "HOME CENTRE", "PEPPERFRY"
    ],
    "Transport": [
        "OLA RIDE", "UBER INDIA", "RAPIDO RIDE", "METRO CARD RECHARGE",
        "IRCTC TICKET", "REDBUS BOOKING", "MAKEMYTRIP", "IXIGO BOOKING",
        "INDIGO AIRLINES", "SPICEJET", "AIR INDIA", "VISTARA",
        "PETROL PUMP", "FASTAG RECHARGE", "NHAI TOLL", "YULU BIKE",
        "BOUNCE RIDE", "VOGO RIDE", "KSRTC BOOKING", "TSRTC BOOKING"
    ],
    "EMI/Loan": [
        "HOME LOAN EMI SBI", "CAR LOAN EMI HDFC", "PERSONAL LOAN EMI AXIS",
        "EDUCATION LOAN EMI", "BAJAJ FINANCE EMI", "HDFC CREDIT EMI",
        "ICICI LOAN REPAYMENT", "KOTAK EMI PAYMENT", "TATA CAPITAL EMI",
        "IDFC FIRST EMI", "CREDIT CARD MIN PAYMENT", "CREDIT CARD BILL",
        "PAYTM POSTPAID", "LAZYPAY REPAYMENT", "SIMPL PAY LATER",
        "AMAZON PAY LATER EMI", "FLIPKART PAY LATER"
    ],
    "Insurance": [
        "LIC PREMIUM", "SBI LIFE INSURANCE", "HDFC LIFE PREMIUM",
        "ICICI PRU LIFE", "MAX LIFE INSURANCE", "TATA AIA PREMIUM",
        "HEALTH INSURANCE STAR", "CARE HEALTH PREMIUM",
        "BAJAJ ALLIANZ", "NEW INDIA ASSURANCE", "DIGIT INSURANCE",
        "ACKO INSURANCE", "VEHICLE INSURANCE"
    ],
    "Investment": [
        "ZERODHA FUND TRANSFER", "GROWW INVESTMENT", "UPSTOX DEPOSIT",
        "KUVERA SIP", "COIN BY ZERODHA", "ANGEL ONE DEPOSIT",
        "MUTUAL FUND SIP", "PPF DEPOSIT", "NPS CONTRIBUTION",
        "GOLD PURCHASE DIGITAL", "SOVEREIGN GOLD BOND", "FD DEPOSIT SBI",
        "RD INSTALLMENT", "SMALLCASE INVESTMENT"
    ],
    "Entertainment": [
        "PVR CINEMAS", "INOX MOVIES", "BOOKMYSHOW TICKET",
        "GAMES24X7", "DREAM11", "MPL GAMING", "PLAYSTATION STORE",
        "STEAM PURCHASE", "GOOGLE PLAY GAMES", "APPLE ARCADE",
        "AMUSEMENT PARK ENTRY", "WONDERLA TICKET", "CONCERT TICKET",
        "IMAGICA ADMISSION"
    ],
    "Medical": [
        "APOLLO PHARMACY", "MEDPLUS", "NETMEDS ORDER", "PHARMEASY",
        "1MG ORDER", "HOSPITAL BILL", "LAB TEST PAYMENT",
        "DENTAL TREATMENT", "EYE CHECKUP", "CONSULTATION FEE",
        "PRACTO APPOINTMENT", "DIAGNOSTIC CENTER"
    ],
    "Miscellaneous": [
        "ATM WITHDRAWAL", "CASH WITHDRAWAL", "UPI TRANSFER",
        "NEFT TRANSFER", "IMPS PAYMENT", "RTGS TRANSFER",
        "CHEQUE DEPOSIT", "DEMAND DRAFT", "ACCOUNT MAINTENANCE FEE",
        "SMS ALERT CHARGES", "LOCKER RENT", "SERVICE CHARGE"
    ]
}

AMOUNT_RANGES = {
    "Groceries": (50, 5000),
    "Subscriptions": (49, 999),
    "Utilities": (100, 8000),
    "Education": (5000, 200000),
    "Food & Dining": (80, 3000),
    "Shopping": (200, 50000),
    "Transport": (20, 25000),
    "EMI/Loan": (1000, 50000),
    "Insurance": (500, 30000),
    "Investment": (500, 100000),
    "Entertainment": (100, 3000),
    "Medical": (50, 20000),
    "Miscellaneous": (100, 50000),
}

def generate_transactions(num_transactions=5000, start_date=None, end_date=None):
    if not start_date:
        start_date = datetime(2023, 4, 1)
    if not end_date:
        end_date = datetime(2026, 3, 31)
    date_range = (end_date - start_date).days
    records = []
    for _ in range(num_transactions):
        category = random.choice(list(CATEGORIES.keys()))
        merchant = random.choice(CATEGORIES[category])
        low, high = AMOUNT_RANGES[category]
        amount = round(random.uniform(low, high), 2)
        date = start_date + timedelta(days=random.randint(0, date_range))
        variation = random.choice(["", " UPI", " NEFT", " AUTOPAY", " MANDATE"])
        if random.random() < 0.3:
            merchant += variation
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "description": merchant,
            "amount": amount,
            "type": "debit",
            "category": category
        })
    return records

def save_csv(records, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["date", "description", "amount", "type", "category"])
        writer.writeheader()
        writer.writerows(records)
    print(f"Generated {len(records)} transactions -> {filepath}")

if __name__ == "__main__":
    records = generate_transactions(5000)
    save_csv(records, os.path.join(os.path.dirname(__file__), "data", "training_transactions.csv"))
