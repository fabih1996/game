// 📁 js/logic/apiClient.js

export async function fetchGPTResponse(prompt, model = "gpt-4") {
    try {
      const res = await fetch("https://supernatural-api.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }]
        })
      });
  
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
      console.error("❌ GPT API error:", err);
      return "The connection to the supernatural network has failed.";
    }
  }