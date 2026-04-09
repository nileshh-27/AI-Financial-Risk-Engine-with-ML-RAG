"""
Smart transaction categorizer.
Specifically designed to handle Indian UPI remarks and standard card/bank descriptions.
"""
import os, re, joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "categorizer.joblib")

KEYWORD_RULES = {
    "Groceries": [
        "kirana", "general store", "provisions", "dmart", "jiomart",
        "bigbasket", "blinkit", "zepto", "reliance fresh", "more megastore",
        "spencers", "star bazaar", "nilgiris", "nature basket",
        "country delight", "milkbasket", "grocery", "supermarket", "mart"
    ],
    "Subscriptions": [
        "truecaller", "netflix", "amazon prime", "hotstar", "spotify",
        "youtube premium", "linkedin premium", "apple", "google one", "google level", "google storage",
        "adobe", "microsoft", "zoom", "canva", "notion", "goog-payments", "google play",
        "jiocinema", "sonyliv", "zee5", "cred mint", "audible",
        "subscription", "renewal"
    ],
    "Utilities": [
        "electricity", "tsspdcl", "apspdcl", "bescom", "water bill",
        "hmwssb", "gas cylinder", "indane", "hp gas", "bharatgas",
        "petrol", "iocl", "jio fiber", "airtel broadband", "act fibernet",
        "bsnl", "recharge", "dth", "tata play", "d2h", "hpcl", "fuel"
    ],
    "Education": [
        "tuition", "college fee", "university", "srm", "vit",
        "bits", "manipal", "amrita", "hostel fee", "exam fee",
        "unacademy", "byjus", "udemy", "coursera", "book depot",
        "scholastic", "cambridge", "education", "school"
    ],
    "Food & Dining": [
        "swiggy", "zomato", "dominos", "pizza hut", "kfc",
        "mcdonalds", "burger king", "subway", "starbucks",
        "cafe coffee day", "chai point", "paradise", "haldirams",
        "barbeque nation", "biryani", "faasos", "box8",
        "eatfit", "dunzo", "restaurant", "food", "dining", "hotel", "bakers", "bakery", "sweets"
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho",
        "tata cliq", "snapdeal", "reliance digital", "croma",
        "vijay sales", "pantaloons", "lifestyle", "max fashion",
        "westside", "decathlon", "ikea", "pepperfry", "home centre", "shri", "enterprises", "traders"
    ],
    "Transport": [
        "ola", "uber", "rapido", "metro card", "irctc", "redbus",
        "makemytrip", "ixigo", "indigo", "spicejet", "air india",
        "vistara", "fastag", "nhai", "toll", "yulu", "bounce",
        "vogo", "ksrtc", "tsrtc", "railways", "flight", "cab", "travel", "tours"
    ],
    "EMI/Loan": [
        "emi", "loan", "repayment", "bajaj finance", "credit card min",
        "credit card bill", "paytm postpaid", "lazypay", "simpl pay",
        "pay later", "personal loan", "home loan", "car loan",
        "education loan", "tata capital", "idfc first", "hdfc bank loan", "sbi loan"
    ],
    "Insurance": [
        "lic premium", "sbi life", "hdfc life", "icici pru",
        "max life", "tata aia", "health insurance", "care health",
        "bajaj allianz", "new india assurance", "digit insurance",
        "acko", "vehicle insurance", "insurance"
    ],
    "Investment": [
        "zerodha", "groww", "upstox", "kuvera", "angel one",
        "mutual fund", "sip", "ppf", "nps", "gold purchase",
        "sovereign gold", "fd deposit", "rd installment",
        "smallcase", "investment"
    ],
    "Entertainment": [
        "pvr", "inox", "bookmyshow", "dream11", "mpl gaming",
        "playstation", "steam", "google play games", "arcade",
        "amusement", "wonderla", "concert", "imagica", "cinema",
        "movie", "games"
    ],
    "Medical": [
        "apollo pharmacy", "medplus", "netmeds", "pharmeasy",
        "1mg", "hospital", "lab test", "dental", "eye checkup",
        "consultation", "practo", "diagnostic", "pharmacy", "medical", "clinic"
    ]
}


def parse_upi_remarks(description: str) -> str:
    """
    Extracts the person or merchant name from UPI transaction remarks.
    Example: 'UPIAR/471907069667/DR/ELURU PR/YESB/ q692179429@yb' => 'ELURU PR'
    Example: 'UPIAB/472715235199/CR/Mekala Y/SBIN/8790512825@sup' => 'Mekala Y'
    """
    if not description.startswith("UPI"):
        return description

    parts = description.split('/')
    if len(parts) >= 4:
        # Check if the third part is DR or CR or directly name
        # Normally UPIxx / txn_id / DR|CR / Name / Bank / UPI_ID
        name_part = parts[3]
        if parts[2] in ["DR", "CR", "dr", "cr"]:
            name_part = parts[3]
        elif parts[1] in ["DR", "CR", "dr", "cr"]:
            name_part = parts[2]

        name_part = name_part.strip()
        if name_part:
            return name_part

    return description


def is_person_transfer(merchant_name: str) -> bool:
    """Heuristic to guess if a name is a person rather than a merchant."""
    # Often UPI merchant names have identifiers like "Enterprises", "Traders", or are 1 word
    name_upper = merchant_name.upper()
    merchant_keywords = ["STORE", "KIRANA", "MART", "ENTERPRISES", "TRADERS", "MEDICAL", "SERVICES", "AGENCY", "CAFE", "HOTEL", "RESTAURANT"]
    if any(kw in name_upper for kw in merchant_keywords):
        return False
    # If it's two words where second word is a single initial (e.g. "Mekala Y")
    if re.match(r'^[A-Z][A-Za-z]+\s[A-Z]$', name_upper):
        return True
    return False


def keyword_categorize(merchant_name: str, raw_description: str) -> str | None:
    merchant_lower = merchant_name.lower()
    raw_lower = raw_description.lower()
    
    # First priority: explicit match in merchant name
    for category, keywords in KEYWORD_RULES.items():
        for kw in keywords:
            if kw in merchant_lower:
                return category
                
    # Second priority: explicit match in raw description
    for category, keywords in KEYWORD_RULES.items():
        for kw in keywords:
            if kw in raw_lower:
                return category
    
    return None


class TransactionCategorizer:
    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)

    def categorize(self, raw_description: str) -> dict:
        merchant_name = parse_upi_remarks(raw_description)
        
        # 1. Try keyword rules
        kw_cat = keyword_categorize(merchant_name, raw_description)
        if kw_cat:
            return {"category": kw_cat, "merchant": merchant_name, "confidence": 0.90, "method": "keyword"}
            
        # 2. Try Person Transfer heuristic for UPI
        if raw_description.startswith("UPI") and is_person_transfer(merchant_name):
            return {"category": "Person Transfer", "merchant": merchant_name, "confidence": 0.80, "method": "heuristic"}

        # 3. Try ML Model
        if self.model:
            try:
                # We feed the clean merchant name to the model for better accuracy than the raw string
                pred = self.model.predict([merchant_name])[0]
                proba = max(self.model.predict_proba([merchant_name])[0])
                if proba > 0.6:
                    return {"category": pred, "merchant": merchant_name, "confidence": round(float(proba), 3), "method": "ml"}
            except Exception:
                pass
                
        # 4. Default
        return {"category": "Miscellaneous", "merchant": merchant_name, "confidence": 0.1, "method": "default"}

    def categorize_batch(self, descriptions: list[str]) -> list[dict]:
        return [self.categorize(d) for d in descriptions]


_categorizer = None

def get_categorizer() -> TransactionCategorizer:
    global _categorizer
    if _categorizer is None:
        _categorizer = TransactionCategorizer()
    return _categorizer
