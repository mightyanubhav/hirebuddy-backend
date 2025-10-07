const express = require("express");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const router = express.Router();

// Initialize Google Gemini with new package
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

// Load local JSON data
let hireBuddyData = {
  faqs: {
    general: [],
    booking_payments: [],
    safety_verification: [],
    buddy_related: [],
    technical: []
  },
  features: [],
  services_categories: {},
  pricing_credits: {},
  company_info: {}
};

try {
  const dataPath = path.join(__dirname, "../data/hirebuddyData.json");
  if (fs.existsSync(dataPath)) {
    const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    hireBuddyData = { ...hireBuddyData, ...rawData };
    console.log("✅ HireBuddy data loaded successfully");
  }
} catch (error) {
  console.error("❌ Error loading data:", error.message);
}

// Enhanced System prompt for Gemini
const SYSTEM_PROMPT = `You are "BuddyBot", the AI assistant for HireBuddy - a platform connecting users with verified local buddies.

**HireBuddy Services:**
- Travel companions & tour guides
- Apartment & PG finding assistance  
- Airport/station pickup & drop services
- Shopping buddies & local companions
- Chatting partners & event buddies

**Key Features:**
- 3 FREE credits on signup, then ₹500 for 5 credits
- 6-step buddy verification process
- 24/7 customer support
- Secure payments & instant refunds

**Your Personality:**
- Be friendly, enthusiastic, and helpful
- Use emojis occasionally to make it engaging
- Keep responses conversational but informative
- If unsure, suggest contacting support

**Important:** Provide unique, creative responses that are different from standard FAQ answers. Add personal touches and make users feel welcomed!`;

// Improved Gemini AI Response Function
async function getGeminiResponse(userMessage) {
  try {
    // Check if API key is properly configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your-free-api-key") {
      console.log("⚠️ Gemini API key not configured, using enhanced local response");
      return getEnhancedLocalResponse(userMessage, true);
    }

    console.log("🚀 Calling Gemini API...");

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Using 2.0-flash which is more widely available
      contents: `${SYSTEM_PROMPT}\n\nUser Question: "${userMessage}"\n\nPlease provide a helpful, engaging response:`,
      config: {
        maxOutputTokens: 250,
        temperature: 0.8, // Increased for more creative responses
        topP: 0.9,
        topK: 40
      }
    });

    const aiReply = response.text.trim();
    
    // Validate that we got a real response from Gemini
    if (aiReply && aiReply.length > 10 && !aiReply.includes("API") && !aiReply.includes("key")) {
    //   console.log("✅ Gemini response received:", aiReply.substring(0, 50) + "...");
      return aiReply;
    } else {
      throw new Error("Invalid response from Gemini");
    }

  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);
    // Return enhanced local response with AI-like formatting
    return getEnhancedLocalResponse(userMessage, true);
  }
}

// Enhanced local response that mimics AI style
function getEnhancedLocalResponse(userMessage, isAIFallback = false) {
  const text = userMessage.toLowerCase().trim();
  
  if (isAIFallback) {
    // When Gemini fails, use these more "AI-like" responses
    if (/(find|search|look for|get).*buddy/.test(text)) {
      return `🎯 Great question! Finding the perfect buddy on HireBuddy is super easy! Here's how:

🔍 **Smart Buddy Discovery:**
1. **Tell us what you need** - Travel companion? Apartment hunter? Shopping buddy?
2. **Browse verified buddies** - See ratings, specialties, and availability  
3. **Filter by location** - Find buddies in your city or destination
4. **Check real reviews** - See what others experienced
5. **Chat before booking** - Message them to ensure they're the right fit!

💡 **Pro Tip:** Use our "Instant Match" feature for quick recommendations based on your needs!

Ready to find your perfect buddy? 😊`;
    }

    if (/(hi|hello|hey)/.test(text)) {
      return `👋 Hey there! Welcome to HireBuddy! I'm BuddyBot, your personal assistant! 

I'm absolutely thrilled to help you discover amazing local buddies for:
✨ Travel adventures & city exploration  
✨ Apartment hunting made easy
✨ Airport pickups & local transport
✨ Shopping sprees with fun companions
✨ And so much more!

What exciting service can I help you with today? 🚀`;
    }

    if (/(price|cost|credit|money)/.test(text)) {
      return `💰 Let me break down our super simple pricing for you:

🎁 **FREE Welcome Bonus:** 3 credits instantly when you join!
💎 **Credit Packs:**
   • 5 credits = ₹500 (Most popular! 🏆)
   • 10 credits = ₹900 (Save ₹100! 💰)  
   • 20 credits = ₹1,600 (Save ₹400! 🎉)

⚡ **No Hidden Fees** - What you see is what you pay!
🔄 **Instant Refunds** - Change your mind? Credits returned immediately!

💡 Each service uses 1-3 credits depending on duration and type. Budget-friendly and transparent! 😊`;
    }
  }

  // Original local responses as fallback
  if (/(hi|hello|hey|hola|namaste|good morning|good afternoon)/.test(text)) {
    return `👋 Hello! I'm your HireBuddy assistant! 
I can help you with booking local buddies, understanding credits, and finding the perfect service for your needs! 😊`;
  }

  if (/(book|booking|reserve|schedule|hire)/.test(text)) {
    return `📅 **How to Book:**
1. Search buddies by service & location
2. Check ratings & specialties  
3. Select date & time
4. Confirm with credits
5. Enjoy your service!`;
  }

  if (/(service|what can|help with)/.test(text)) {
    return `🛎️ **Services:** Travel buddies, apartment hunting, pickup/drop, shopping companions, tour guides, and more!`;
  }

  return `I'd love to help you with "${userMessage}"! At HireBuddy, we connect you with verified local buddies for various services. You can ask me about booking, pricing, services, or becoming a buddy! 💫`;
}

// Improved main chatbot route
router.post("/", async (req, res) => {
  try {
    const userMessage = req.body.message;
    
    if (!userMessage || userMessage.trim() === "") {
      return res.json({ 
        reply: "Hey there! 👋 I'm excited to help you with HireBuddy! What would you like to know?",
        source: "local"
      });
    }

    console.log("User message:", userMessage);

    let reply;
    let source = "local";

    // Use Gemini for most queries except very simple ones
    const useGemini = userMessage.length > 2 && 
                     !/(hi|hello|hey|test|ping)/.test(userMessage.toLowerCase());
    
    if (useGemini) {
      reply = await getGeminiResponse(userMessage);
      source = "gemini-ai";
      
      // Check if we actually got a Gemini response or fell back to local
      if (reply.includes("BuddyBot") || reply.includes("🎯") || reply.length > 150) {
        source = "gemini-ai";
      } else {
        source = "enhanced-local";
      }
    } else {
      reply = getEnhancedLocalResponse(userMessage);
      source = "local";
    }

    res.json({ 
      reply: reply,
      source: source,
      suggestedTopics: [
        "Find travel buddies",
        "Apartment hunting help", 
        "Pricing & credits",
        "Become a buddy"
      ]
    });

  } catch (error) {
    console.error("Chatbot error:", error);
    res.json({ 
      reply: getEnhancedLocalResponse(req.body.message || "hello"),
      source: "error-fallback"
    });
  }
});

// Better test endpoint
router.get("/test-gemini", async (req, res) => {
  try {
    const testMessages = [
      "How do I find a travel buddy for my trip to Goa?",
      "What's the process to become a verified buddy?",
      "Can you help me find someone to show me around Mumbai?",
      "How does the credit system work?"
    ];

    const testMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
    const response = await getGeminiResponse(testMessage);
    
    const isRealAI = !response.includes("💰") && !response.includes("📅") && response.length > 100;

    res.json({
      test_message: testMessage,
      gemini_response: response,
      response_length: response.length,
      is_real_ai: isRealAI,
      api_key_configured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your-free-api-key",
      status: isRealAI ? "✅ Real Gemini AI Response" : "⚠️ Using Enhanced Local Response"
    });
  } catch (error) {
    res.json({
      error: error.message,
      status: "Gemini test failed"
    });
  }
});

// Debug endpoint to check API status
router.get("/debug", (req, res) => {
  const hasValidKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your-free-api-key";
  
  res.json({
    gemini_configured: hasValidKey,
    api_key_present: !!process.env.GEMINI_API_KEY,
    key_length: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
    key_starts_with: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + "..." : "none",
    status: hasValidKey ? "✅ Ready for Gemini AI" : "⚠️ Using Local Responses Only"
  });
});

module.exports = router;