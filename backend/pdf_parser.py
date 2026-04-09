"""
Bank statement PDF parser — rewritten for real Union Bank of India statements.

Union Bank format:
  Columns: Date | Transaction Id | Remarks | Amount(₹) | Balance(₹)
  Amount has (Dr) for debit, (Cr) for credit suffix.
  Balance always has (Cr) suffix.
  Remarks contain UPI details: UPIAR/txn_id/DR/merchant/bank/upi_id

Also extracts account metadata (account number, name, branch, IFSC)
from the first page header.
"""
import re
from datetime import datetime
from typing import Optional
import pdfplumber


# ──────────────────────────────────────────────────────────────
# Date parsing
# ──────────────────────────────────────────────────────────────
DATE_FORMATS = [
    "%d-%m-%Y", "%d/%m/%Y", "%d %b %Y", "%d-%b-%Y",
    "%d/%m/%y", "%d-%m-%y", "%d %b %y", "%d-%b-%y",
    "%Y-%m-%d", "%d.%m.%Y", "%d.%m.%y",
]


def parse_date(date_str: str) -> Optional[str]:
    date_str = date_str.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


# ──────────────────────────────────────────────────────────────
# Amount parsing — handles "(Dr)" / "(Cr)" suffixes
# ──────────────────────────────────────────────────────────────
DR_CR_RE = re.compile(r'([\d,]+\.?\d*)\s*\(?\s*(Dr|Cr|DR|CR|dr|cr)\s*\)?', re.IGNORECASE)
PLAIN_AMT_RE = re.compile(r'^[\d,]+\.?\d*$')


def parse_amount_with_type(raw: str) -> tuple[Optional[float], Optional[str]]:
    """
    Parse an amount string like '20.0(Dr)' or '1000.0(Cr)' or '179.38(Cr)'.
    Returns (amount, 'debit'|'credit') or (None, None).
    """
    if not raw:
        return None, None
    raw = raw.strip().replace('\xa0', '').replace(' ', '')

    m = DR_CR_RE.search(raw)
    if m:
        num_str = m.group(1).replace(',', '')
        try:
            amount = round(float(num_str), 2)
        except ValueError:
            return None, None
        dr_cr = m.group(2).lower()
        return amount, ("debit" if dr_cr == "dr" else "credit")

    # No (Dr)/(Cr) — try plain number
    cleaned = re.sub(r'[₹,\s]', '', raw)
    if PLAIN_AMT_RE.match(cleaned):
        try:
            return round(float(cleaned), 2), None
        except ValueError:
            pass
    return None, None


# ──────────────────────────────────────────────────────────────
# Account info extraction from page header
# ──────────────────────────────────────────────────────────────
def extract_account_info(text: str) -> dict:
    info = {
        "account_number": None,
        "account_name": None,
        "branch": None,
        "ifsc": None,
        "bank": "union_bank",
    }

    # Account number patterns
    for pattern in [
        r'(?:A/?c\s*(?:No|Number|#)?\.?\s*:?\s*)(\d{10,18})',
        r'(?:Account\s*(?:No|Number|#)?\.?\s*:?\s*)(\d{10,18})',
        r'(?:Acct\s*(?:No)?\.?\s*:?\s*)(\d{10,18})',
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            info["account_number"] = m.group(1)
            break

    # Account holder name
    for pattern in [
        r'(?:Name\s*:?\s*)([A-Z][A-Z\s\.]+?)(?:\s+(?:A/?c|Account|Branch|IFSC|CIF|Email))',
        r'(?:Customer\s*Name\s*:?\s*)([A-Z][A-Z\s\.]+)',
        r'(?:Account\s*Holder\s*:?\s*)([A-Z][A-Z\s\.]+)',
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            info["account_name"] = m.group(1).strip()
            break

    # Branch
    m = re.search(r'(?:Branch\s*:?\s*)([A-Za-z\s\-]+?)(?:\s+(?:IFSC|A/?c|Date|CIF|SOL))', text, re.IGNORECASE)
    if m:
        info["branch"] = m.group(1).strip()

    # IFSC
    m = re.search(r'(?:IFSC\s*(?:Code)?\s*:?\s*)([A-Z]{4}0[A-Z0-9]{6})', text, re.IGNORECASE)
    if m:
        info["ifsc"] = m.group(1)

    return info


# ──────────────────────────────────────────────────────────────
# Bank detection
# ──────────────────────────────────────────────────────────────
def detect_bank(text: str) -> str:
    t = text.lower()
    if "union bank" in t or "uboi" in t or "union bank of india" in t:
        return "union_bank"
    if "hdfc" in t:
        return "hdfc"
    if "sbi" in t or "state bank" in t:
        return "sbi"
    if "icici" in t:
        return "icici"
    if "axis" in t:
        return "axis"
    if "kotak" in t:
        return "kotak"
    if "canara" in t:
        return "canara"
    if "pnb" in t or "punjab national" in t:
        return "pnb"
    if "bob" in t or "bank of baroda" in t:
        return "bob"
    return "generic"


# ──────────────────────────────────────────────────────────────
# Union Bank table parser (primary)
# ──────────────────────────────────────────────────────────────
def parse_union_bank(pdf) -> list[dict]:
    """
    Parse Union Bank statement tables.
    Expected columns: Date | Txn Id | Remarks | Amount(₹) | Balance(₹)
    Amount column has values like '20.0(Dr)', '1000.0(Cr)'.
    """
    transactions = []

    for page in pdf.pages:
        tables = page.extract_tables()
        if not tables:
            continue

        for table in tables:
            if not table:
                continue

            # Detect header row to find column indices
            col_map = _detect_columns(table)

            for row in table:
                if not row or len(row) < 3:
                    continue

                # Skip header rows
                row_text = ' '.join([str(c) for c in row if c]).lower()
                if any(h in row_text for h in ['transaction id', 'remarks', 'amount', 'balance', 'date ']):
                    continue
                if 'opening balance' in row_text or 'closing balance' in row_text:
                    continue

                # Extract date
                date_val = _get_cell(row, col_map.get("date", 0))
                date = parse_date(date_val) if date_val else None
                if not date:
                    continue

                # Extract transaction ID
                txn_id = _get_cell(row, col_map.get("txn_id", 1)) or ""

                # Extract remarks/description
                remarks = _get_cell(row, col_map.get("remarks", 2)) or ""
                if not remarks or len(remarks) < 3:
                    continue

                # Extract amount with Dr/Cr type
                amount_raw = _get_cell(row, col_map.get("amount", 3)) or ""
                amount, txn_type = parse_amount_with_type(amount_raw)

                if amount is None or amount == 0:
                    continue

                # If type wasn't detected from the amount column, try the remarks
                if txn_type is None:
                    txn_type = _infer_type_from_remarks(remarks)

                # Extract balance
                balance_raw = _get_cell(row, col_map.get("balance", 4)) or ""
                balance, _ = parse_amount_with_type(balance_raw)
                if balance is None:
                    balance = 0.0

                transactions.append({
                    "date": date,
                    "txn_id": txn_id.strip(),
                    "description": remarks.strip(),
                    "amount": amount,
                    "type": txn_type or "debit",
                    "balance": balance,
                })

    return transactions


def parse_hdfc_bank(pdf) -> list[dict]:
    """Parse HDFC Bank statement tables."""
    transactions = []

    for page in pdf.pages:
        tables = page.extract_tables()
        if not tables:
            continue

        for table in tables:
            if not table:
                continue

            col_map = _detect_hdfc_columns(table)
            
            # Require minimum recognizable columns to proceed
            if "date" not in col_map or "narration" not in col_map:
                continue

            for row in table:
                if not row or len(row) < 5:
                    continue

                row_text = ' '.join([str(c) for c in row if c]).lower()
                # Skip header / footer rows
                if any(h in row_text for h in ['narration', 'withdrawal amount', 'deposit amount', 'closing balance', 'opening balance']):
                    continue

                # Extract date
                date_val = _get_cell(row, col_map.get("date", 0))
                date = parse_date(date_val) if date_val else None
                if not date:
                    continue

                # Extract Transaction ID/Ref No
                txn_id = _get_cell(row, col_map.get("ref_no", 2))

                # Extract Remarks
                remarks = _get_cell(row, col_map.get("narration", 1))
                if not remarks:
                    continue

                # Determine Type & Amount utilizing split columns
                withdrawal_raw = _get_cell(row, col_map.get("withdrawal", -1))
                deposit_raw = _get_cell(row, col_map.get("deposit", -1))
                
                amount = 0.0
                txn_type = "debit"
                
                if withdrawal_raw:
                    w_amt, _ = parse_amount_with_type(withdrawal_raw)
                    if w_amt and w_amt > 0:
                        amount = w_amt
                        txn_type = "debit"
                        
                if amount == 0.0 and deposit_raw:
                    d_amt, _ = parse_amount_with_type(deposit_raw)
                    if d_amt and d_amt > 0:
                        amount = d_amt
                        txn_type = "credit"

                if amount == 0.0:
                    continue

                # Extract Balance
                balance_raw = _get_cell(row, col_map.get("balance", -1))
                balance, _ = parse_amount_with_type(balance_raw)
                if balance is None:
                    balance = 0.0

                transactions.append({
                    "date": date,
                    "txn_id": txn_id.strip(),
                    "description": remarks.strip(),
                    "amount": amount,
                    "type": txn_type,
                    "balance": balance,
                })

    return transactions


def _detect_columns(table: list) -> dict:
    """Detect column positions from the header row."""
    col_map = {"date": 0, "txn_id": 1, "remarks": 2, "amount": 3, "balance": 4}

    for row in table[:3]:
        if not row:
            continue
        row_lower = [str(c).lower().strip() if c else "" for c in row]
        for i, cell in enumerate(row_lower):
            if "date" in cell:
                col_map["date"] = i
            elif "transaction" in cell and "id" in cell:
                col_map["txn_id"] = i
            elif "remark" in cell or "narration" in cell or "particular" in cell or "description" in cell:
                col_map["remarks"] = i
            elif "amount" in cell and "balance" not in cell:
                col_map["amount"] = i
            elif "balance" in cell:
                col_map["balance"] = i
    return col_map


def _detect_hdfc_columns(table: list) -> dict:
    """Detect HDFC column positions from the header row."""
    col_map = {}
    for row in table[:5]:
        if not row: continue
        row_lower = [str(c).lower().strip() if c else "" for c in row]
        for i, cell in enumerate(row_lower):
            if "date" in cell and "value" not in cell:
                col_map["date"] = i
            elif "narration" in cell or "description" in cell or "particular" in cell:
                col_map["narration"] = i
            elif "chq" in cell or "ref" in cell:
                col_map["ref_no"] = i
            elif "withdrawal" in cell or "dr" in cell or "debit" in cell:
                col_map["withdrawal"] = i
            elif "deposit" in cell or "cr" in cell or "credit" in cell:
                col_map["deposit"] = i
            elif "balance" in cell:
                col_map["balance"] = i
        if len(col_map) >= 5:
            break
    return col_map


def _get_cell(row: list, index: int) -> str:
    if index < len(row) and row[index] is not None:
        return str(row[index]).strip()
    return ""


def _infer_type_from_remarks(remarks: str) -> str:
    """Infer debit/credit from UPI remarks like /DR/ or /CR/."""
    r_upper = remarks.upper()
    if "/DR/" in r_upper:
        return "debit"
    if "/CR/" in r_upper:
        return "credit"
    if "DEBIT" in r_upper:
        return "debit"
    if "CREDIT" in r_upper or "CREDITED" in r_upper:
        return "credit"
    return "debit"  # Default to debit for most transactions


# ──────────────────────────────────────────────────────────────
# Generic text parser (fallback)
# ──────────────────────────────────────────────────────────────
def parse_generic_text(pdf) -> list[dict]:
    transactions = []
    patterns = [
        re.compile(
            r'(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})\s+'
            r'(.+?)\s+'
            r'([\d,]+\.?\d*)\s*\(?\s*(Dr|Cr)\s*\)?',
            re.IGNORECASE
        ),
    ]
    for page in pdf.pages:
        text = page.extract_text() or ""
        for line in text.split('\n'):
            line = line.strip()
            if not line or len(line) < 10:
                continue
            for pattern in patterns:
                match = pattern.search(line)
                if match:
                    groups = match.groups()
                    date = parse_date(groups[0])
                    if not date:
                        continue
                    description = groups[1].strip()
                    amount_str = groups[2].replace(',', '')
                    try:
                        amount = round(float(amount_str), 2)
                    except ValueError:
                        continue
                    dr_cr = groups[3].lower()
                    txn_type = "debit" if dr_cr == "dr" else "credit"
                    transactions.append({
                        "date": date,
                        "txn_id": "",
                        "description": description,
                        "amount": amount,
                        "type": txn_type,
                        "balance": 0,
                    })
                    break
    return transactions


# ──────────────────────────────────────────────────────────────
# Main entry point
# ──────────────────────────────────────────────────────────────
def parse_pdf(file_path: str) -> dict:
    """
    Parse a bank statement PDF and return structured data.

    Returns:
        {
            "bank": str,
            "account_info": { account_number, account_name, branch, ifsc },
            "transactions": [ { date, txn_id, description, amount, type, balance } ],
            "total_pages": int,
            "period": { start, end } | None,
        }
    """
    with pdfplumber.open(file_path) as pdf:
        total_pages = len(pdf.pages)

        # Get text from first page for bank detection and account info
        first_text = ""
        for page in pdf.pages[:2]:
            first_text += (page.extract_text() or "") + "\n"

        bank = detect_bank(first_text)
        account_info = extract_account_info(first_text)
        account_info["bank"] = bank

        # Parse transactions based on detected bank profile
        if bank == "hdfc":
            transactions = parse_hdfc_bank(pdf)
        else:
            transactions = parse_union_bank(pdf)

        # Fallback to generic text parsing
        if not transactions:
            transactions = parse_generic_text(pdf)

    # Deduplicate
    seen = set()
    unique = []
    for t in transactions:
        key = (t["date"], t["description"][:40], t["amount"], t["type"])
        if key not in seen:
            seen.add(key)
            unique.append(t)
    transactions = unique

    # Sort by date
    transactions.sort(key=lambda x: x["date"])

    # Period
    period = None
    if transactions:
        period = {"start": transactions[0]["date"], "end": transactions[-1]["date"]}

    return {
        "bank": bank,
        "account_info": account_info,
        "transactions": transactions,
        "total_pages": total_pages,
        "period": period,
    }
