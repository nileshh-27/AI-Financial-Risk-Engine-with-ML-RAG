import ollama

def generate_explanation(data: dict):
    """
    Generates a structured financial explanation using gemma3:1b.
    Expects 'predicted_probability', 'prediction', and 'top_features'.
    """
    prob = data.get("predicted_probability", 0)
    top_features = data.get("top_features", [])
    
    feature_str = "\n".join([f"- {f['feature']}: {f['value']} (Risk Impact: {f.get('impact', 'Moderate')})" for f in top_features])
    
    prompt = f"""
You are a Financial Risk Advisor. Analyze the following risk assessment data and provide a concise, 
professional explanation of the financial health and potential warnings.

Risk Summary:
- Predicted Risk Probability: {prob * 100:.1f}%
- Key Signals Identified:
{feature_str}

Instructions:
1. Provide a 2-3 sentence summary of the overall financial risk.
2. Highlight the most concerning 'Key Signal' if any.
3. Suggest one immediate corrective action.
4. Use Markdown (bolding and bullets). Do not use an intro or outro.
"""

    return ollama.chat(
        model='gemma3:1b',
        messages=[{'role': 'user', 'content': prompt.strip()}],
        stream=True
    )
