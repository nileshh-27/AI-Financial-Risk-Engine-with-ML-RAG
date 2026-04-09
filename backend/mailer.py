import os
import smtplib
from email.message import EmailMessage
import sys
from datetime import datetime

def send_analysis_email(user_email: str, summary_data: dict, file_reports: list):
    """
    Sends an HTML formatted email containing the Risk Analysis Report.
    If credentials are not configured, prints the email gracefully.
    """
    if not user_email:
        print("No user email provided for report.", file=sys.stderr)
        return

    # Extract configs
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 465))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")

    # Build report UI
    account_info = summary_data.get("account_info", {})
    account_name = account_info.get("account_name") or "Your Account"
    
    categories = sorted(summary_data.get("categories", []), key=lambda x: x.get("total", 0), reverse=True)[:5]
    
    cat_html = "".join([
        f"<li><b>{c.get('category')}:</b> ₹{c.get('total', 0):,.2f}</li>"
        for c in categories
    ])

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #6366f1;">Union Bank - AI Financial Risk Report</h2>
            <p>Dear Valued User,</p>
            <p>Your bank statement has been successfully analyzed by the proprietary ML Risk Engine.</p>
            
            <h3>Account Overview</h3>
            <ul>
                <li><b>Account:</b> {account_name}</li>
                <li><b>Total Monitored Vol:</b> ₹{summary_data.get('total_debit', 0) + summary_data.get('total_credit', 0):,.2f}</li>
                <li><b>Total Transactions:</b> {summary_data.get('total_transactions', 0)}</li>
                <li><b>Net Cashflow:</b> ₹{summary_data.get('net_flow', 0):,.2f}</li>
            </ul>

            <h3>Top Spending Categories</h3>
            <ul>
                {cat_html}
            </ul>

            <p style="margin-top: 30px;">
                You can review your full categorized transaction ledger, detected recurring subscriptions, and personalized debt-trap warnings by logging into the Dashboard.
            </p>
            
            <p style="font-size: 0.8em; color: #888;">Report generated at {datetime.utcnow().isoformat()}Z</p>
        </div>
    </body>
    </html>
    """

    msg = EmailMessage()
    msg['Subject'] = f"Your AI Financial Risk Report ({datetime.now().strftime('%b %d, %Y')})"
    msg['From'] = smtp_user or "noreply@riskdashboard.ai"
    msg['To'] = user_email
    msg.set_content("Please enable HTML to view your Risk Report.")
    msg.add_alternative(html_content, subtype='html')

    if not smtp_user or not smtp_pass:
        print("\n--- MOCK EMAIL REPORT SENT ---")
        print(f"To: {user_email}")
        print(f"Subject: {msg['Subject']}")
        print(f"Body: (HTML content omitted, see mailer.py)\n")
        return

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        print(f"Successfully emailed Risk Report to {user_email}")
    except Exception as e:
        print(f"Failed to send email to {user_email}: {e}", file=sys.stderr)

