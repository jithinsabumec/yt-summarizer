// background.js
// IMPORTANT: Replace this with your actual OpenRouter API key before publishing
const OPENROUTER_API_KEY = "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"; 
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "qwen/qwq-32b:free"; // You can change this to your preferred model

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateVideoSummary') {
    generateVideoSummary(request.transcript, request.videoTitle)
      .then(summary => sendResponse({ success: true, summary }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async sendResponse
  }
  else if (request.action === 'generateCommentOverview') {
    generateCommentOverview(request.comments)
      .then(overview => sendResponse({ success: true, overview }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Function to generate video summary
async function generateVideoSummary(transcript, videoTitle) {
  const truncatedTranscript = transcript.substring(0, 15000);
  
  const prompt = `
You are an AI that summarizes YouTube videos based on their transcripts.

Video Title: ${videoTitle}

Here is the video transcript:
${truncatedTranscript}

Provide a concise summary of the video content in 2-3 paragraphs.

Format your response as a JSON object with this structure:
{
  "summary": "Your 2-3 paragraph summary here"
}

Make sure your response is properly formatted JSON that can be parsed.
`;
  
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'chrome-extension://' + chrome.runtime.id,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful AI that provides concise YouTube video summaries."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    let result = data.choices[0].message.content;
    
    // Try to parse the JSON response
    try {
      const jsonResponse = JSON.parse(result);
      return jsonResponse.summary;
    } catch (e) {
      // If not valid JSON, just return the raw text
      return result;
    }
  } catch (error) {
    console.error('Error calling OpenRouter API for video summary:', error);
    throw new Error('Failed to generate video summary');
  }
}

// Function to generate comment overview and sentiment
async function generateCommentOverview(comments) {
  const truncatedComments = comments.substring(0, 5000);
  
  const prompt = `
You are an AI that analyzes YouTube video comments.

Here are some viewer comments:
${truncatedComments}

Analyze these comments and provide:
1. A brief overview of what viewers think about the video (1-2 paragraphs)
2. The overall sentiment (exactly one of these: Positive, Slightly Positive, Neutral, Slightly Negative, or Negative)

Format your response as a JSON object with this structure:
{
  "overview": "Your 1-2 paragraph analysis of viewer opinions",
  "sentiment": "Positive/Slightly Positive/Neutral/Slightly Negative/Negative"
}

Make sure your response is properly formatted JSON that can be parsed.
`;
  
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'chrome-extension://' + chrome.runtime.id,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful AI that analyzes YouTube video comments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    let result = data.choices[0].message.content;
    
    // Try to parse the JSON response
    try {
      return JSON.parse(result);
    } catch (e) {
      // If not valid JSON, create a structured object with the raw text
      return {
        overview: result,
        sentiment: "Neutral" // Default sentiment if parsing fails
      };
    }
  } catch (error) {
    console.error('Error calling OpenRouter API for comment overview:', error);
    throw new Error('Failed to generate comment overview');
  }
}

// This would go in your content script or popup.js where you display the results

function displaySummary(summaryText) {
  // Parse the summary to extract the sentiment
  const lines = summaryText.split('\n');
  let sentiment = '';
  
  // Find the sentiment in the text
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "positive" || line === "slightly positive" || 
        line === "neutral" || line === "slightly negative" || 
        line === "negative") {
      sentiment = line;
      break;
    }
  }
  
  // Create HTML for display
  let summaryHTML = '';
  let inViewerSection = false;
  let addedSentimentPill = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Video Summary')) {
      summaryHTML += `<h2>${line}</h2>`;
    } else if (line.startsWith('What viewers think')) {
      summaryHTML += `<h2>${line}</h2>`;
      inViewerSection = true;
    } else if (inViewerSection && !addedSentimentPill && 
              sentiment && line !== sentiment) {
      // Add the sentiment pill before the paragraph about comments
      const pillColor = getSentimentColor(sentiment);
      summaryHTML += `
        <div class="sentiment-pill" style="
          display: inline-block;
          background-color: ${pillColor};
          color: white;
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: bold;
          margin: 10px 0;
        ">
          Overall sentiment: ${sentiment}
        </div>
      `;
      addedSentimentPill = true;
      summaryHTML += `<p>${line}</p>`;
    } else if (line) {
      // Skip the raw sentiment line
      if (line !== sentiment) {
        summaryHTML += `<p>${line}</p>`;
      }
    } else {
      summaryHTML += '<br>';
    }
  }
  
  // Add the HTML to your container element
  document.getElementById('summary-container').innerHTML = summaryHTML;
}

function getSentimentColor(sentiment) {
  // Handle undefined, null or invalid sentiment values
  if (!sentiment || typeof sentiment !== 'string') {
    console.warn('Invalid sentiment value:', sentiment);
    return '#6c757d'; // Default to neutral gray
  }

  const colors = {
    'positive': '#28a745',        // green
    'slightly positive': '#75c687', // light green
    'neutral': '#6c757d',         // gray
    'slightly negative': '#de7885', // light red
    'negative': '#dc3545'         // red
  };
  
  const normalizedSentiment = sentiment.toLowerCase().trim();
  return colors[normalizedSentiment] || colors.neutral;
}