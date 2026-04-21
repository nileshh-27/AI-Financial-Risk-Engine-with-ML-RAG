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
# Universal statement parser
# ──────────────────────────────────────────────────────────────
def _detect_universal_columns(table: list) -> dict:
    """Dynamically scan headers to determine column layout regardless of bank."""
    col_map = {}
    for row in table[:5]:
        if not row: continue
        row_lower = [str(c).lower().strip() if c else "" for c in row]
        for i, cell in enumerate(row_lower):
            if "date" in cell and "value" not in cell:
                if "date" not in col_map: col_map["date"] = i
            elif "narration" in cell or "description" in cell or "particular" in cell or "remark" in cell:
                if "remarks" not in col_map: col_map["remarks"] = i
            elif "chq" in cell or "ref" in cell or ("txn" in cell and "id" in cell) or "cheque" in cell:
                if "txn_id" not in col_map: col_map["txn_id"] = i
            elif "withdrawal" in cell or "dr" in cell or "debit" in cell:
                if "withdrawal" not in col_map: col_map["withdrawal"] = i
            elif "deposit" in cell or "cr" in cell or "credit" in cell:
                if "deposit" not in col_map: col_map["deposit"] = i
            elif "amount" in cell and "balance" not in cell and "withdrawal" not in cell and "deposit" not in cell:
                if "amount" not in col_map: col_map["amount"] = i
            elif "balance" in cell:
                if "balance" not in col_map: col_map["balance"] = i
                
        # If we have Date + Description + (Amount OR Withdrawal/Deposit), it's a valid header
        has_dates_desc = "date" in col_map and "remarks" in col_map
        has_amt = "amount" in col_map or ("withdrawal" in col_map and "deposit" in col_map)
        if has_dates_desc and has_amt:
            break
            
    return col_map


def parse_universal_statement(pdf) -> list[dict]:
    transactions = []
    saved_col_map = None

    for page in pdf.pages:
        tables = page.extract_tables()
        if not tables or all(len(t) <= 1 for t in tables):
            tables = page.extract_tables({"vertical_strategy": "text", "horizontal_strategy": "text"})
            
        if not tables:
            continue

        for table in tables:
            if not table:
                continue

            col_map = _detect_universal_columns(table)
            
            # Save headers if found. A valid header has Date + Remarks + Some money structure.
            has_dates_desc = "date" in col_map and "remarks" in col_map
            has_amt = "amount" in col_map or ("withdrawal" in col_map and "deposit" in col_map)
            
            if has_dates_desc and has_amt:
                saved_col_map = col_map
            
            active_map = saved_col_map if saved_col_map else col_map
            
            if "date" not in active_map or "remarks" not in active_map:
                continue

            last_txn = None
            for row in table:
                if not row or len(row) < 3:
                    continue

                row_text = ' '.join([str(c) for c in row if c]).lower()
                # Skip header/footer heuristics
                if any(h in row_text for h in ['statement summary', 'opening balance', 'closing balance']):
                    continue
                # If the row text looks exactly like the headers (withdrawal, deposit, amount), skip
                if ("date" in row_text and ("particular" in row_text or "narration" in row_text or "remark" in row_text)) or "withdrawal" in row_text:
                    continue

                date_val = _get_cell(row, active_map.get("date", 0))
                date = parse_date(date_val) if date_val else None
                
                remarks = _get_cell(row, active_map.get("remarks", 1))

                if not date:
                    # Multi-line remark merger: if date is empty but we have remarks, append to the last transaction!
                    if last_txn and remarks and len(remarks) > 2 and 'balance' not in remarks.lower():
                        last_txn["description"] += " " + remarks.strip()
                    continue

                txn_id = _get_cell(row, active_map.get("txn_id", -1))
                if not remarks or len(remarks) < 3:
                    continue

                amount = 0.0
                txn_type = "debit"

                # Check unified amount column
                if "amount" in active_map:
                    amount_raw = _get_cell(row, active_map["amount"])
                    amt, t_res = parse_amount_with_type(amount_raw)
                    if amt:
                        amount = amt
                        if t_res:
                            txn_type = t_res
                        else:
                            txn_type = _infer_type_from_remarks(remarks)
                else:
                    # Check split columns
                    w_raw = _get_cell(row, active_map.get("withdrawal", -1))
                    d_raw = _get_cell(row, active_map.get("deposit", -1))
                    
                    w_amt, _ = parse_amount_with_type(w_raw)
                    d_amt, _ = parse_amount_with_type(d_raw)
                    
                    if w_amt and w_amt > 0:
                        amount = w_amt
                        txn_type = "debit"
                    elif d_amt and d_amt > 0:
                        amount = d_amt
                        txn_type = "credit"
                        
                if amount == 0.0:
                    continue

                balance_raw = _get_cell(row, active_map.get("balance", -1))
                balance, _ = parse_amount_with_type(balance_raw)
                
                txn = {
                    "date": date,
                    "txn_id": txn_id.strip() if txn_id else "",
                    "description": remarks.strip(),
                    "amount": amount,
                    "type": txn_type,
                    "balance": balance if balance is not None else 0.0,
                }
                transactions.append(txn)
                last_txn = txn

    return transactions

def _get_cell(row: list, index: int) -> str:
    if index < len(row) and index >= 0 and row[index] is not None:
        return str(row[index]).strip()
    return ""

def _infer_type_from_remarks(remarks: str) -> str:
    """Infer debit/credit from UP remarks like /DR/ or /CR/."""
    r_upper = remarks.upper()
    if "/DR/" in r_upper or "DEBIT" in r_upper:
        return "debit"
    if "/CR/" in r_upper or "CREDIT" in r_upper or "CREDITED" in r_upper:
        return "credit"
    return "debit"

# ──────────────────────────────────────────────────────────────
# Generic text parser (fallback)
# ──────────────────────────────────────────────────────────────
def parse_generic_text(pdf) -> list[dict]:
    transactions = []
    
    # 1. Advanced ICICI/SBI multi-line split column detection
    lines = []
    for page in pdf.pages:
        lines.extend((page.extract_text() or "").split('\n'))

    icici_pattern = re.compile(r'^(\d+)\s+(\d{2}[/\-\.]\d{2}[/\-\.]\d{2,4})\s+([\d,\.]+)(?:\s+([\d,\.]+))?\s+([\d,\.]+)[\sA-Za-z0-9]*$')
    
    # We will build transactions list using a cascading buffer logic
    has_icici = any(icici_pattern.match(l.strip()) for l in lines)
    if has_icici:
        buffer = []
        for line in lines:
            line_str = line.strip()
            if not line_str: continue
            
            m = icici_pattern.match(line_str)
            if m:
                sno, date_raw, w_raw, d_raw, bal_raw = m.groups()
                date = parse_date(date_raw)
                w_amt = parse_amount_with_type(w_raw)[0] or 0.0
                d_amt = parse_amount_with_type(d_raw)[0] if d_raw else 0.0
                
                amount = w_amt if w_amt > 0 else d_amt
                txn_type = "debit" if w_amt > 0 else "credit"
                    
                # Clean up junk headers out of the buffer
                clean_buffer = [b for b in buffer if not any(x in b for x in ["Cheque Number", "Balance", "S No.", "Transaction Remarks"])]
                desc = " ".join(clean_buffer[-3:]) if len(clean_buffer) > 0 else "Transaction"
                
                if date:
                    transactions.append({
                        "date": date,
                        "txn_id": "",
                        "description": desc,
                        "amount": amount,
                        "type": txn_type,
                        "balance": parse_amount_with_type(bal_raw)[0] or 0.0,
                    })
                buffer = []
            else:
                buffer.append(line_str)
        
        if transactions:
            return transactions

    # 2. Standard Single-Line Format Backoff
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
    try:
        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)

            # Get text from first page for bank detection and account info
            first_text = ""
            for page in pdf.pages[:2]:
                first_text += (page.extract_text() or "") + "\n"

            bank = detect_bank(first_text)
            account_info = extract_account_info(first_text)
            account_info["bank"] = bank

            # Process all standard and legacy format banks dynamically
            transactions = parse_universal_statement(pdf)

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
    except Exception as e:
        if "password" in str(e).lower():
            raise Exception("PASSWORD_PROTECTED: This PDF is encrypted. Please upload a decrypted version or provide the password.")
        raise e
