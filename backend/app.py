"""
Flask API server for the financial analysis engine.
Handles PDF uploads, transaction analysis, and predictions.
All data is persisted to Supabase.
"""
import os
import sys
import json
import uuid
import tempfile
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from pdf_parser import parse_pdf
from categorizer import get_categorizer
from recurring_detector import detect_recurring
from debt_trap_analyzer import analyze_debt_traps
from predictor import predict_next_fy
from mailer import send_analysis_email
import google.generativeai as genai

app = Flask(__name__)
CORS(app, origins=["http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:3000"])

# Supabase setup
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

_supabase_client = None

def get_supabase():
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase_client


def extract_user_info(auth_header: str) -> dict:
    """Extract user ID and email from JWT bearer token."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return {}
    token = auth_header.replace("Bearer ", "").strip()
    parts = token.split(".")
    if len(parts) < 2:
        return {}
    
    import base64
    try:
        # Standard base64 padding fix
        payload_b64 = parts[1] + '=='
        payload_json = base64.b64decode(payload_b64).decode('utf-8')
        payload = json.loads(payload_json)
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email")
        }
    except:
        return {}

def get_gemini_model():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-1.5-flash')
    try:
        import base64
        padding = 4 - len(parts[1]) % 4
        payload = base64.urlsafe_b64decode(parts[1] + "=" * padding)
        data = json.loads(payload)
        return data.get("sub")
    except Exception:
        return None


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "financial-analysis-engine"})


@app.route("/api/analyze-pdf", methods=["POST"])
def analyze_pdf():
    """
    Accepts multiple PDF files, parses transactions, categorizes them,
    detects recurring payments, analyzes debt traps, and stores everything in Supabase.
    """
    auth_header = request.headers.get("Authorization", "")
    user_id = extract_user_id(auth_header)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No PDF files uploaded"}), 400

    all_transactions = []
    file_reports = []

    account_info = None

    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            file_reports.append({"filename": file.filename, "error": "Not a PDF file", "transactions": 0})
            continue

        # Save temporarily
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        try:
            file.save(tmp.name)
            tmp.close()

            # Parse PDF
            result = parse_pdf(tmp.name)
            transactions = result["transactions"]
            
            if result.get("account_info") and not account_info:
                account_info = result["account_info"]

            file_reports.append({
                "filename": file.filename,
                "bank": result["bank"],
                "transactions": len(transactions),
                "period": result["period"],
                "pages": result["total_pages"],
            })

            all_transactions.extend(transactions)
        except Exception as e:
            file_reports.append({"filename": file.filename, "error": str(e), "transactions": 0})
        finally:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass

    if not all_transactions:
        return jsonify({
            "error": "No transactions could be extracted from the uploaded files.",
            "file_reports": file_reports,
        }), 422

    # Categorize transactions
    categorizer = get_categorizer()
    for txn in all_transactions:
        # Pass description to categorizer which extracts the merchant
        cat_result = categorizer.categorize(txn["description"])
        txn["category"] = cat_result["category"]
        txn["merchant"] = cat_result["merchant"]
        txn["category_confidence"] = cat_result["confidence"]
        txn["category_method"] = cat_result["method"]

    # Detect recurring payments
    recurring = detect_recurring(all_transactions, min_occurrences=2)

    # Analyze debt traps
    debt_traps = analyze_debt_traps(all_transactions)

    # Predict next fiscal year
    prediction = predict_next_fy(all_transactions)

    # Calculate category summary
    category_summary = {}
    for txn in all_transactions:
        if txn.get("type") != "debit":
            continue
        cat = txn["category"]
        if cat not in category_summary:
            category_summary[cat] = {"total": 0, "count": 0}
        category_summary[cat]["total"] += txn["amount"]
        category_summary[cat]["count"] += 1

    # Format category summary
    cat_summary_list = [
        {"category": cat, "total": round(data["total"], 2), "count": data["count"]}
        for cat, data in category_summary.items()
    ]
    cat_summary_list.sort(key=lambda x: x["total"], reverse=True)

    # Calculate overall stats
    total_debit = sum(t["amount"] for t in all_transactions if t.get("type") == "debit")
    total_credit = sum(t["amount"] for t in all_transactions if t.get("type") == "credit")

    # Build response
    analysis_result = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "analyzed_at": datetime.utcnow().isoformat(),
        "file_reports": file_reports,
        "account_info": account_info,
        "summary": {
            "total_transactions": len(all_transactions),
            "total_debit": round(total_debit, 2),
            "total_credit": round(total_credit, 2),
            "net_flow": round(total_credit - total_debit, 2),
            "categories_found": len(category_summary),
        },
        "transactions": all_transactions,
        "category_summary": cat_summary_list,
        "recurring_payments": recurring,
        "debt_traps": debt_traps,
        "prediction": prediction,
    }

    # Store in Supabase
    try:
        sb = get_supabase()

        # Store the analysis result securely inside existing schema columns
        # Bundle extra data inside summary JSONB
        analysis_result["summary"]["account_info"] = account_info
        analysis_result["summary"]["transactions"] = all_transactions
        
        sb.table("pdf_analyses").insert({
            "id": analysis_result["id"],
            "user_id": user_id,
            "file_reports": file_reports,
            "summary": analysis_result["summary"],
            "category_summary": cat_summary_list,
            "recurring_payments": recurring,
            "debt_traps": debt_traps,
            "prediction": prediction,
        }).execute()

        # Safely store parsed transactions into the main `transactions` table
        txn_rows = []
        for txn in all_transactions:
            txn_rows.append({
                "id": str(uuid.uuid4())[:8],
                "user_id": user_id,
                "date": txn["date"],
                "merchant": txn.get("merchant") or txn.get("description", "Unknown"),
                "category": txn["category"],
                "amount": txn["amount"],
                "channel": txn.get("category_method", "pdf"),
                "status": "Credit" if txn["type"] == "credit" else "Debit",
                "risk_flag": "Low",
            })

        # Insert in batches of 100
        for i in range(0, len(txn_rows), 100):
            batch = txn_rows[i:i + 100]
            sb.table("transactions").insert(batch).execute()

        # Send Report Email
        if user_email:
            send_analysis_email(user_email, analysis_result, file_reports)

    except Exception as e:
        print(f"Supabase storage error: {e}", file=sys.stderr)
        # Don't fail the request — still return analysis results
        analysis_result["storage_warning"] = f"Analysis completed but data storage failed: {str(e)}"

    return jsonify(analysis_result)

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    RAG-enabled chat endpoint.
    Retrieves user transaction history and uses it as context for Gemini.
    """
    auth_header = request.headers.get("Authorization", "")
    user_info = extract_user_info(auth_header)
    if not user_info.get("user_id"):
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json or {}
    messages = data.get("messages", [])
    if not messages:
        return jsonify({"message": {"role": "assistant", "content": "How can I help you with your finances today?"}})

    try:
        # 1. Fetch user data for RAG
        sb = get_supabase()
        user_id = user_info["user_id"]
        
        # Get latest analysis for summary context
        analysis_res = sb.table("pdf_analyses").select("summary,category_summary,recurring_payments").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        
        # Get recent transactions
        txn_res = sb.table("transactions").select("date,merchant,category,amount,status").eq("user_id", user_id).order("date", desc=True).limit(50).execute()
        
        context_parts = ["You are a Financial Risk Assistant for Union Bank."]
        if analysis_res.data:
            summary = analysis_res.data[0].get("summary", {})
            context_parts.append(f"User Summary: Total Credit: {summary.get('total_credit')}, Total Debit: {summary.get('total_debit')}, Net Flow: {summary.get('net_flow')}.")
        
        if txn_res.data:
            txns_str = "\n".join([f"- {t['date']}: {t['merchant']} ({t['category']}) - ₹{t['amount']} [{t['status']}]" for t in txn_res.data])
            context_parts.append(f"Recent Transactions:\n{txns_str}")

        system_prompt = "\n".join(context_parts)
        
        # 2. Call Gemini
        model = get_gemini_model()
        if not model:
            return jsonify({"message": {"role": "assistant", "content": "I'm sorry, my AI brain (Gemini API) is not configured in the .env file yet. Please contact support."}})

        # Build chat history for Gemini
        chat_session = model.start_chat(history=[])
        
        # Pre-instruct with context
        full_query = f"SYSTEM CONTEXT: {system_prompt}\n\nUSER QUERY: {messages[-1]['content']}"
        
        response = chat_session.send_message(full_query)
        
        return jsonify({
            "message": {
                "role": "assistant",
                "content": response.text
            }
        })

    except Exception as e:
        print(f"Chat error: {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500


@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Generate prediction from previously stored transactions for a user.
    """
    auth_header = request.headers.get("Authorization", "")
    user_info = extract_user_info(auth_header)
    user_id = user_info.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        sb = get_supabase()
        result = sb.table("parsed_transactions")\
            .select("date,description,amount,txn_type,category")\
            .eq("user_id", user_id)\
            .order("date")\
            .execute()

        transactions = [
            {
                "date": r["date"],
                "description": r["description"],
                "amount": float(r["amount"]),
                "type": r["txn_type"],
                "category": r["category"],
            }
            for r in (result.data or [])
        ]

        prediction = predict_next_fy(transactions)
        return jsonify(prediction)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analysis-history", methods=["GET"])
def analysis_history():
    """Get previous analysis results for the authenticated user."""
    auth_header = request.headers.get("Authorization", "")
    user_info = extract_user_info(auth_header)
    user_id = user_info.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        sb = get_supabase()
        result = sb.table("pdf_analyses")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(20)\
            .execute()

        return jsonify(result.data or [])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5001))
    print(f"Financial Analysis Engine starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)
