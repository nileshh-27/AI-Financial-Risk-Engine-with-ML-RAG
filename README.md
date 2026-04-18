---
title: Financial Risk Engine
emoji: 💰
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---
# Financial Risk Engine using ML and RAG

An AI-powered financial monitoring platform designed to parse bank statement PDFs, categorize transactions using ML, detect recurring payments, and provide personalized risk assessments with a real-time RAG (Retrieval-Augmented Generation) chatbot.

<img width="1918" height="906" alt="image" src="https://github.com/user-attachments/assets/51fb8e25-6f0a-4a03-a94d-590d48612db7" />

## 🚀 Key Features

### 🏦 Intelligent PDF Parsing
- **Transaction Normalization:** Automatically handles `(Dr)` and `(Cr)` suffixes and normalized date formats.
- **Batch Processing:** Upload multiple years of PDFs to build a deep financial profile.

### 🧠 ML-Driven Analytics
- **Smart Categorization:** Uses a Hybrid Keyword + ML (Naive Bayes) model to categorize UPI, ATM, and Merchant transactions.
- **Recurring Payment Detection:** Identifies subscriptions (Netflix, Spotify), Autopays, and regular bills.
- **Debt Trap Analysis:** Flags high EMI-to-income ratios and multiple BNPL payments.
- **FY Prediction:** Forecasts next fiscal year spending trends based on historic data.

### 💬 Risk Assistant (RAG Chatbot)
- **Data-Grounded AI:** A Chatbot powered by Google Gemini that answers questions specifically about *your* transactions and risk profile.
- **Privacy First:** Data is retrieved dynamically from your secure Supabase storage and injected into the LLM context only for your session.

### 📧 Automated Risk Reports
- **Instant Insights:** Recieve a sleek HTML report via email immediately after PDF analysis is complete.
- **Performance:** Summarizes top spending categories and top-level risk metrics.

## 🛠️ Security & Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI, Recharts, Framer Motion.
- **Backend:** Flask (Python 3.10+), Pandas, Scikit-learn, PDFPlumber.
- **Database:** Supabase (PostgreSQL with RLS), Auth, and Storage.
- **Security:** MFA Authentication, 2-minute inactivity auto-logout, JWT session protection.

## ⚙️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/risk-dashboard-ui.git
   cd risk-dashboard-ui
   ```

2. **Frontend Setup**
   ```bash
   npm install
   ```

3. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

4. **Environment Variables**
   Create a `.env` file in the root directory (use `.env.example` as a template):
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   GEMINI_API_KEY=your_google_ai_key
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

5. **Run the Application**
   - **Frontend:** `npm run dev`
   - **Backend:** `cd backend && python app.py`

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

---
*Built for advanced financial risk monitoring.*
# aide-project

