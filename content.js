// content.js
(() => {
    // Variables
    let currentVideoId = '';
    let summarizing = false;
    let summarySection = null;
    
    // Improve YouTube video detection on initial load
    function setupInitialPageLoad() {
        // Check if we're on a video page immediately
        if (window.location.pathname === '/watch' && getCurrentVideoId()) {
            // We're already on a video page, set up everything immediately
            onNavigationChange();
            
            // Also set up a more aggressive initial check to ensure elements are found
            const initialCheckInterval = setInterval(() => {
                const likesButton = document.querySelector('button[aria-label*="like"]');
                const commentsSection = document.querySelector("#comments");
                
                if (likesButton && commentsSection) {
                    clearInterval(initialCheckInterval);
                    
                    // Only add button if it doesn't already exist
                    if (!document.querySelector('.summary-button')) {
                        addSummaryButton(likesButton);
                        createSummarySection(commentsSection);
                    }
                }
            }, 300); // Check more frequently initially
            
            // Stop aggressive checking after 10 seconds to prevent performance issues
            setTimeout(() => clearInterval(initialCheckInterval), 10000);
        }
    }
    
    // Handle YouTube's SPA (Single Page Application) navigation
    function setupNavigationDetection() {
        // Initial setup
        setupInitialPageLoad();
        
        // Monitor URL changes
        let lastUrl = location.href;
        const observer = new MutationObserver((mutations) => {
            // If the URL changed
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                onNavigationChange();
            }
            
            // Also check for YouTube's dynamic content loading
            // This helps catch when YouTube loads new components without changing the URL
            const likesButton = document.querySelector('button[aria-label*="like"]');
            const commentsSection = document.querySelector("#comments");
            
            if (likesButton && commentsSection && !document.querySelector('.summary-button') && 
                window.location.pathname === '/watch' && getCurrentVideoId()) {
                addSummaryButton(likesButton);
                createSummarySection(commentsSection);
            }
        });
        
        // Observe the entire document for changes
        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: false
        });
    }
    
    // Handle navigation changes
    function onNavigationChange() {
        const newVideoId = getCurrentVideoId();
        
        // Clear previous summary if navigating to a different video
        if (newVideoId && newVideoId !== currentVideoId) {
            currentVideoId = newVideoId;
            clearSummary();
            
            // Remove any existing button to prevent duplicates
            const existingButton = document.querySelector('.summary-button');
            if (existingButton) {
                existingButton.remove();
            }
        }
        
        // Setup interface elements
        checkForYouTubeElements();
    }
    
    // Check for YouTube elements to inject our button and summary section
    function checkForYouTubeElements() {
        // Clear any existing interval to prevent multiple checks
        if (window.checkIntervalId) {
            clearInterval(window.checkIntervalId);
        }
        
        // Create an interval to keep checking until elements are found
        window.checkIntervalId = setInterval(() => {
            const likesButton = document.querySelector('button[aria-label*="like"]');
            const commentsSection = document.querySelector("#comments");
            
            if (likesButton && commentsSection && !document.querySelector('.summary-button')) {
                clearInterval(window.checkIntervalId);
                addSummaryButton(likesButton);
                createSummarySection(commentsSection);
            }
        }, 500); // Check every 500ms
    }
    
    function addSummaryButton(likesButton) {
        const actionsContainer = likesButton.closest('#top-level-buttons-computed');
        
        if (!actionsContainer) return;
        
        // Create button
        const summaryButton = document.createElement('button');
        summaryButton.className = 'summary-button';
        
        // Add the brain icon and text to the button using SVG instead of Material Icons
        summaryButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7 0V0C7.40491 3.68528 10.3147 6.59509 14 7V7V7C10.3147 7.40491 7.40491 10.3147 7 14V14V14C6.59509 10.3147 3.68528 7.40491 0 7V7V7C3.68528 6.59509 6.59509 3.68528 7 0V0Z" fill="#FFFFFF"/>
<defs>
<linearGradient id="paint0_linear_325_225" x1="7" y1="0" x2="7" y2="14" gradientUnits="userSpaceOnUse">
<stop stop-color="#E0E0E0"/>
<stop offset="1" stop-color="#B3B3B3"/>
</linearGradient>
</defs>
</svg>

            Generate Summary
        `;
        
        summaryButton.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            color: #FFFFFF;
            font-size: 14px;
            height: 36px;
            font-family: "Roboto", "Arial", sans-serif;
            margin-left: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 6px 16px;
            border-radius: 50px;
            border: none;
            transition: background 0.3s;
        `;
        
        // Add hover effect
        summaryButton.addEventListener('mouseover', () => {
            summaryButton.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        summaryButton.addEventListener('mouseout', () => {
            summaryButton.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        
        // Add event listener
        summaryButton.addEventListener('click', handleSummaryClick);
        
        // Add button to UI
        actionsContainer.appendChild(summaryButton);
    }
  
    function createSummarySection(commentsSection) {
        // Remove any existing summary section to prevent duplicates
        if (summarySection) {
            summarySection.remove();
        }
        
        // Create summary container
        summarySection = document.createElement('div');
        summarySection.className = 'video-summary-section';
        summarySection.style.display = 'none';
        summarySection.dataset.videoId = currentVideoId; // Tag with current video ID
        
        // Insert before comments
        commentsSection.parentNode.insertBefore(summarySection, commentsSection);
    }
  
    async function handleSummaryClick() {
        if (summarizing) return;
        
        const videoId = getCurrentVideoId();
        if (!videoId) {
            console.error('No video ID found');
            return;
        }
        
        summarizing = true;
        updateSummaryButton('Summarizing...', true);
        
        // Create or ensure the summary section exists
        if (!summarySection || summarySection.style.display === 'none') {
            const commentsSection = document.querySelector("#comments");
            if (commentsSection) {
                createSummarySection(commentsSection);
            }
        }
        
        // Show the summary section with loading animation
        updateSummarySection('', true, videoId);
        displayLoadingState('Generating video summary...');
        
        try {
            // STEP 1: Get transcript and generate video summary
            const transcript = await getVideoTranscript();
            
            if (!transcript) {
                console.error('No transcript found');
                updateSummarySection('Could not retrieve video transcript.', true);
                summarizing = false;
                updateSummaryButton('Generate Summary', false);
                return;
            }
            
            const videoTitle = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent || 'Video';
            
            // Generate video summary
            const summaryResponse = await chrome.runtime.sendMessage({
                action: 'generateVideoSummary',
                transcript: transcript,
                videoTitle: videoTitle,
                videoId: videoId
            });
            
            // Display the video summary
            if (summaryResponse && summaryResponse.success) {
                displayVideoSummary(summaryResponse.summary);
                
                // STEP 2: Now get comments and generate the overview
                displayLoadingCommentState();
                
                const comments = await getVideoComments();
                
                if (!comments || comments.length < 50) {
                    displayCommentOverview("Insufficient comments to analyze.", "Neutral");
                    updateSummaryButton('Generate Summary', false);
                    summarizing = false;
                    return;
                }
                
                // Generate comment overview
                const commentResponse = await chrome.runtime.sendMessage({
                    action: 'generateCommentOverview',
                    comments: comments,
                    videoId: videoId
                });
                
                // Display the comment overview
                if (commentResponse && commentResponse.success) {
                    displayCommentOverview(
                        commentResponse.overview.overview || commentResponse.overview,
                        commentResponse.overview.sentiment || "Neutral"
                    );
                } else {
                    displayCommentOverview("Unable to analyze comments.", "Neutral");
                }
            } else {
                updateSummarySection(`Unable to generate summary. Error: ${summaryResponse?.error || 'Unknown error'}`, true);
            }
            
            updateSummaryButton('Generate Summary', false);
        } catch (error) {
            console.error('Error during summarization:', error);
            updateSummarySection(`Error generating summary: ${error.message}. Please try again.`, true);
            updateSummaryButton('Try Again', false);
        }
        
        summarizing = false;
    }
  
    function updateSummaryButton(text, isLoading) {
        const button = document.querySelector('.summary-button');
        if (!button) return;
        
        if (isLoading) {
            // Show loading spinner with the star icon
            button.innerHTML = `
                <div class="loading-spinner"></div>
                <span>${text}</span>
            `;
            
            // Add the spinner style if it doesn't exist
            if (!document.getElementById('spinner-style')) {
                const style = document.createElement('style');
                style.id = 'spinner-style';
                style.textContent = `
                    .loading-spinner {
                        width: 14px;
                        height: 14px;
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        border-top-color: white;
                        animation: spin 1s ease-in-out infinite;
                        margin-right: 8px;
                    }
                    
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            // Restore original button with star icon
            button.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 0V0C7.40491 3.68528 10.3147 6.59509 14 7V7V7C10.3147 7.40491 7.40491 10.3147 7 14V14V14C6.59509 10.3147 3.68528 7.40491 0 7V7V7C3.68528 6.59509 6.59509 3.68528 7 0V0Z" fill="#FFFFFF"/>
                    <defs>
                    <linearGradient id="paint0_linear_325_225" x1="7" y1="0" x2="7" y2="14" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#E0E0E0"/>
                    <stop offset="1" stop-color="#B3B3B3"/>
                    </linearGradient>
                    </defs>
                </svg>
                ${text}
            `;
        }
        
        button.disabled = isLoading;
    }
  
    function updateSummarySection(content, show, videoId = null) {
        if (!summarySection) return;
        
        if (videoId) {
            summarySection.dataset.videoId = videoId;
        }
        
        if (show) {
            summarySection.style.display = 'block';
        } else {
            summarySection.style.display = 'none';
        }
        
        // If it's the loading state, only show the loading text without headings
        if (content === 'Generating summary...' || content === 'Fetching content...') {
            summarySection.innerHTML = `
                <div class="loading-text shimmer-text">${content}</div>
            `;
            
            // Add the shimmer effect CSS if it doesn't exist
            if (!document.getElementById('shimmer-style')) {
                const style = document.createElement('style');
                style.id = 'shimmer-style';
                style.textContent = `
                    @keyframes textShimmer {
                        0% { color: rgba(255, 255, 255, 0.5); }
                        50% { color: rgba(255, 255, 255, 1); }
                        100% { color: rgba(255, 255, 255, 0.5); }
                    }
                    
                    .shimmer-text {
                        animation: textShimmer 1.5s ease-in-out infinite;
                        font-size: 16px;
                        font-weight: 500;
                        color: #ffffff;
                        text-align: center;
                        padding: 20px 0;
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            // Parse summary to extract parts
            processSummaryContent(content);
        }
    }
  
    function processSummaryContent(content) {
        let videoSummaryContent = '';
        let viewerThoughtsContent = '';
        let currentSection = '';
        let sentiment = '';
        
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Extract sentiment if line matches the pattern
            if (line.toLowerCase().startsWith('sentiment:')) {
                sentiment = line.split(':')[1].trim().toLowerCase();
                continue;
            }
            
            if (line.toLowerCase().includes('video summary')) {
                currentSection = 'video';
                continue;
            } else if (line.toLowerCase().includes('what viewers think')) {
                currentSection = 'viewers';
                continue;
            } else if (line) {
                if (currentSection === 'video') {
                    videoSummaryContent += `<p>${line}</p>`;
                } else if (currentSection === 'viewers') {
                    viewerThoughtsContent += `<p>${line}</p>`;
                }
            }
        }
        
        // Add the gradient style if it doesn't exist
        if (!document.getElementById('gradient-heading-style')) {
            const style = document.createElement('style');
            style.id = 'gradient-heading-style';
            style.textContent = `
                .gradient-heading {
                    font-family: 'Space Mono', monospace;
                    background: linear-gradient(180deg, #FFF 0%, #999 100%);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    font-weight: 700;
                    padding-left: 8px;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Get sentiment color
        const sentimentColor = getSentimentColor(sentiment);
        
        // Build final HTML with sentiment inside the pill
        summarySection.innerHTML = `
            <h2 class="summary-heading">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7 0V0C7.40491 3.68528 10.3147 6.59509 14 7V7V7C10.3147 7.40491 7.40491 10.3147 7 14V14V14C6.59509 10.3147 3.68528 7.40491 0 7V7V7C3.68528 6.59509 6.59509 3.68528 7 0V0Z" fill="url(#paint0_linear_325_225)"/>
<defs>
<linearGradient id="paint0_linear_325_225" x1="7" y1="0" x2="7" y2="14" gradientUnits="userSpaceOnUse">
<stop stop-color="#E0E0E0"/>
<stop offset="1" stop-color="#B3B3B3"/>
</linearGradient>
</defs>
</svg>

                <span class="gradient-heading">VIDEO SUMMARY</span>
            </h2>
            <div class="summary-content">${videoSummaryContent}</div>
            
            <h2 class="summary-heading viewer-thoughts-heading">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 2H8C4.691 2 2 4.691 2 8V21C2 21.388 2.224 21.741 2.572 21.907C2.714 21.975 2.869 22.009 3.023 22.009C3.244 22.009 3.463 21.926 3.633 21.766L7.383 18.323C7.574 18.145 7.831 18.049 8.097 18.049H16C19.309 18.049 22 15.358 22 12.049V8C22 4.691 19.309 2 16 2Z" fill="#FFFFFF"/>
                    <path d="M15.5 8.5H7.5C6.119 8.5 5 9.619 5 11V19C5 19.388 5.224 19.741 5.572 19.907C5.714 19.975 5.869 20.009 6.023 20.009C6.244 20.009 6.463 19.926 6.633 19.766L9.383 17.323C9.574 17.145 9.831 17.049 10.097 17.049H15.5C16.881 17.049 18 15.93 18 14.549V11C18 9.619 16.881 8.5 15.5 8.5Z" stroke="#FFFFFF" stroke-width="1.5" fill="none"/>
                </svg>
                <span class="gradient-heading">WHAT VIEWERS THINK</span>
            </h2>
            <div class="sentiment-pill" style="background-color: ${sentimentColor}">
                ${sentiment.toUpperCase()}
            </div>
            <div class="summary-content">${viewerThoughtsContent}</div>
        `;
    }
  
    // Get sentiment color based on sentiment value
    function getSentimentColor(sentiment) {
        // Normalize the sentiment string for easier comparison
        const normalizedSentiment = sentiment.toString().toLowerCase().trim();
        
        // Handle each possible sentiment value
        if (normalizedSentiment === 'positive') {
            return '#28a745'; // Bright green for positive
        } else if (normalizedSentiment === 'slightly positive') {
            return '#5cb85c'; // Lighter green for slightly positive
        } else if (normalizedSentiment === 'neutral') {
            return '#6c757d'; // Gray for neutral
        } else if (normalizedSentiment === 'slightly negative') {
            return '#f0ad4e'; // Orange/amber for slightly negative
        } else if (normalizedSentiment === 'negative') {
            return '#dc3545'; // Red for negative
        } else {
            // Default case if sentiment doesn't match expected values
            console.warn('Unknown sentiment value:', sentiment);
            return '#6c757d'; // Default to neutral gray
        }
    }
  
    function formatSummary(summary) {
      return summary
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }
  
    async function getVideoTranscript() {
      // Try to find the transcript button
      const menuButton = Array.from(document.querySelectorAll('button'))
        .find(button => button.textContent.includes('More actions') || 
                        button.getAttribute('aria-label')?.includes('More actions'));
      
      if (!menuButton) {
        // Alternative: Try to scrape available captions directly
        return scrapeAvailableCaptions();
      }
      
      // Click to open menu
      menuButton.click();
      
      // Wait for menu to appear
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Look for "Show transcript" option
      const transcriptOption = Array.from(document.querySelectorAll('tp-yt-paper-item, .ytd-menu-service-item-renderer'))
        .find(item => item.textContent.includes('Show transcript'));
      
      if (!transcriptOption) {
        // Close menu if opened
        document.body.click();
        return scrapeAvailableCaptions();
      }
      
      // Click transcript option
      transcriptOption.click();
      
      // Wait for transcript panel to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Extract transcript text
      const transcriptPanel = document.querySelector('ytd-transcript-segment-list-renderer');
      if (!transcriptPanel) {
        return scrapeAvailableCaptions();
      }
      
      const transcriptItems = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer');
      let transcriptText = '';
      
      transcriptItems.forEach(item => {
        const text = item.querySelector('#content-text')?.textContent || '';
        transcriptText += text + ' ';
      });
      
      // Close transcript panel
      const closeButton = document.querySelector('button[aria-label="Close transcript"]');
      if (closeButton) {
        closeButton.click();
      }
      
      return transcriptText.trim();
    }
  
    async function scrapeAvailableCaptions() {
      // Try to get captions from YouTube's hidden caption track
      const captionsTrack = document.querySelector('track[kind="captions"]');
      if (captionsTrack && captionsTrack.src) {
        try {
          const response = await fetch(captionsTrack.src);
          const text = await response.text();
          
          // Parse VTT format
          const captions = text.split('\n\n')
            .filter(block => block.includes('-->'))
            .map(block => {
              const lines = block.split('\n');
              return lines[lines.length - 1];
            })
            .join(' ');
          
          return captions;
        } catch (e) {
          console.error('Error fetching captions:', e);
        }
      }
      
      // If all else fails, use video description as fallback
      const description = document.querySelector('#description-inline-expander')?.textContent || '';
      return description ? `(Based on video description only) ${description}` : '';
    }
  
    // Function to fetch summary
    async function fetchSummary(videoId) {
        if (currentVideoId !== videoId) {
            currentVideoId = videoId; // Update the current video ID
            let response = await chrome.runtime.sendMessage({ action: "generateSummary", videoId: videoId });
            return response.summary || "Failed to generate summary.";
        }
        return "Summary already generated for this video.";
    }
  
    // Function to clear the summary
    function clearSummary() {
        if (summarySection) {
            summarySection.innerHTML = '';
            summarySection.style.display = 'none';
            
            // If this summary is for a different video, remove it entirely
            if (summarySection.dataset.videoId !== currentVideoId) {
                summarySection.remove();
                summarySection = null;
            }
        }
    }
  
    // Get the current video ID from URL
    function getCurrentVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }
    
    // Add this new function to scrape comments
    async function getVideoComments() {
        // Get the comments section container
        const commentsSection = document.querySelector('ytd-comments#comments');
        if (!commentsSection) return '';
    
        // Save current scroll position
        const currentScrollPosition = window.scrollY;
    
        // Scroll to load more comments (about 100 comments) without affecting user view
        let previousCommentCount = 0;
        let attempts = 0;
        const maxAttempts = 10;
    
        while (attempts < maxAttempts) {
            const commentElements = document.querySelectorAll('ytd-comment-thread-renderer');
            if (commentElements.length >= 100 || commentElements.length === previousCommentCount) {
                break;
            }
            previousCommentCount = commentElements.length;
            
            // Programmatically scroll the comments section without changing user's view
            const commentsContainer = document.querySelector('ytd-item-section-renderer#sections');
            if (commentsContainer) {
                commentsContainer.scrollTop += 1000; // Scroll down by 1000px within the container
            } else {
                // Fallback: scroll window but restore position immediately
                window.scrollTo(0, commentsSection.offsetTop + 1000);
                window.scrollTo(0, currentScrollPosition);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
    
        // Restore original scroll position
        window.scrollTo(0, currentScrollPosition);
    
        // Collect comments (up to 100)
        const comments = [];
        const commentElements = document.querySelectorAll('ytd-comment-thread-renderer');
        
        for (let i = 0; i < Math.min(100, commentElements.length); i++) {
            const commentText = commentElements[i].querySelector('#content-text')?.textContent;
            if (commentText) {
                comments.push(commentText.trim());
            }
        }
        
        return comments.join('\n\n');
    }
    
    // Add this function to track video changes
    function setupVideoChangeTracking() {
        // Initial check when page loads
        checkForVideoChange();
        
        // Create a MutationObserver to detect page changes
        const observer = new MutationObserver(function(mutations) {
            checkForVideoChange();
        });
        
        // Start observing changes to the document body
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also listen for navigation events in YouTube's SPA
        window.addEventListener('yt-navigate-finish', function() {
            console.log('YouTube navigation detected, checking for video change...');
            checkForVideoChange();
        });
        
        // Additional URL change detection
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                console.log('URL changed, checking for video change...');
                setTimeout(checkForVideoChange, 500); // Small delay to ensure page is loaded
            }
        }).observe(document, {subtree: true, childList: true});
    }
    
    // Function to check if we've navigated to a new video
    function checkForVideoChange() {
        const videoId = getVideoId();
        if (videoId && videoId !== currentVideoId) {
            console.log(`Video changed from ${currentVideoId} to ${videoId}`);
            currentVideoId = videoId;
            
            // Reset the summary section for the new video
            if (summarySection) {
                updateSummarySection('Fetching content...', false);
            }
            
            // Wait a moment for the page to fully load, then process the new video
            setTimeout(() => {
                console.log(`Processing new video: ${currentVideoId}`);
                // Clear any existing summary
                if (summarySection) {
                    updateSummarySection('', false);
                }
                
                // Reinitialize the interface for the new video
                initializeInterface();
            }, 1000);
        }
    }
    
    // Improved video ID extraction
    function getVideoId() {
        // Try to get ID from URL first
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v');
        
        // If that fails, try to get it from the video element
        if (!videoId) {
            const videoElement = document.querySelector('video');
            if (videoElement) {
                const videoUrl = videoElement.baseURI;
                const match = videoUrl.match(/[?&]v=([^&]+)/);
                if (match && match[1]) {
                    return match[1];
                }
            }
            return null;
        }
        
        return videoId;
    }
    
    // Update your initializeInterface function to call this
    function initializeInterface() {
        // Existing code...
        
        // Make sure to call setupVideoChangeTracking at some point
        setupVideoChangeTracking();
        
        // Rest of your initialization code...
    }
    
    // Display the loading state for the entire summary section
    function displayLoadingState(message) {
        if (!summarySection) return;
        
        summarySection.innerHTML = `
            <h2 class="summary-heading">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7 0V0C7.40491 3.68528 10.3147 6.59509 14 7V7V7C10.3147 7.40491 7.40491 10.3147 7 14V14V14C6.59509 10.3147 3.68528 7.40491 0 7V7V7C3.68528 6.59509 6.59509 3.68528 7 0V0Z" fill="url(#paint0_linear_325_225)"/>
<defs>
<linearGradient id="paint0_linear_325_225" x1="7" y1="0" x2="7" y2="14" gradientUnits="userSpaceOnUse">
<stop stop-color="#E0E0E0"/>
<stop offset="1" stop-color="#B3B3B3"/>
</linearGradient>
</defs>
</svg>

                <span class="gradient-heading">VIDEO SUMMARY</span>
            </h2>
            <div class="summary-content">
                <div class="shimmer-line"></div>
                <div class="shimmer-line"></div>
                <div class="shimmer-line"></div>
            </div>
        `;
    }
    
    // Display the video summary part
    function displayVideoSummary(summary) {
        if (!summarySection) return;
        
        // Process summary to remove \n\n and JSON artifacts
        let cleanSummary = summary;
        
        // Remove JSON code blocks if they exist
        cleanSummary = cleanSummary.replace(/```json|```/g, '');
        
        // Clean up \n\n and replace with proper paragraph breaks
        cleanSummary = cleanSummary.replace(/\\n\\n/g, '\n\n');
        
        // If it looks like JSON, try to parse it
        if (cleanSummary.trim().startsWith('{') && cleanSummary.trim().endsWith('}')) {
            try {
                const jsonData = JSON.parse(cleanSummary);
                // If successful, use the summary property
                if (jsonData.summary) {
                    cleanSummary = jsonData.summary;
                }
            } catch (e) {
                console.error('Error parsing JSON in video summary:', e);
                // If parsing fails, use the text as is after cleaning
            }
        }
        
        // Clean any remaining JSON-like artifacts
        cleanSummary = cleanSummary.replace(/{"summary":|}/g, '');
        cleanSummary = cleanSummary.replace(/["']/g, '');
        
        // Create the summary content with paragraphs
        const paragraphs = cleanSummary.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');
        
        summarySection.innerHTML = `
            <h2 class="summary-heading">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7 0V0C7.40491 3.68528 10.3147 6.59509 14 7V7V7C10.3147 7.40491 7.40491 10.3147 7 14V14V14C6.59509 10.3147 3.68528 7.40491 0 7V7V7C3.68528 6.59509 6.59509 3.68528 7 0V0Z" fill="url(#paint0_linear_325_225)"/>
<defs>
<linearGradient id="paint0_linear_325_225" x1="7" y1="0" x2="7" y2="14" gradientUnits="userSpaceOnUse">
<stop stop-color="#E0E0E0"/>
<stop offset="1" stop-color="#B3B3B3"/>
</linearGradient>
</defs>
</svg>

                <span class="gradient-heading">VIDEO SUMMARY</span>
            </h2>
            <div class="summary-content">${paragraphs}</div>
            <div id="comment-section"></div>
        `;
    }
    
    // Display loading state for comment section
    function displayLoadingCommentState() {
        const commentSection = document.getElementById('comment-section');
        if (!commentSection) return;
        
        commentSection.innerHTML = `
            <h2 class="summary-heading viewer-thoughts-heading">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.9229 5.104C11.4138 3.91217 10.5088 2.93269 9.36091 2.33114C8.21298 1.72959 6.89255 1.54288 5.62284 1.80257C4.35313 2.06227 3.21205 2.75244 2.3925 3.7564C1.57296 4.76036 1.12522 6.01652 1.125 7.31251V11.8125C1.125 12.1109 1.24353 12.397 1.4545 12.608C1.66548 12.819 1.95163 12.9375 2.25 12.9375H6.09398C6.53293 13.9399 7.25423 14.7929 8.16983 15.3922C9.08542 15.9915 10.1557 16.3113 11.25 16.3125H15.75C16.0484 16.3125 16.3345 16.194 16.5455 15.983C16.7565 15.772 16.875 15.4859 16.875 15.1875V10.6875C16.8747 9.31239 16.3707 7.98499 15.4583 6.9562C14.5458 5.92741 13.2881 5.2685 11.9229 5.104ZM15.75 15.1875H11.25C10.4543 15.1866 9.67297 14.9752 8.98538 14.5747C8.29779 14.1742 7.72839 13.599 7.335 12.9073C8.10543 12.8273 8.85101 12.589 9.52495 12.2072C10.1989 11.8255 10.7867 11.3085 11.2513 10.6888C11.716 10.0691 12.0476 9.36005 12.2252 8.60613C12.4028 7.85221 12.4227 7.06971 12.2836 6.30775C13.2703 6.5406 14.1494 7.0998 14.7786 7.89473C15.4077 8.68965 15.75 9.67374 15.75 10.6875V15.1875Z" fill="url(#paint0_linear_334_239)"/>
<defs>
<linearGradient id="paint0_linear_334_239" x1="9" y1="1.68848" x2="9" y2="16.3125" gradientUnits="userSpaceOnUse">
<stop stop-color="#B9B9B9"/>
<stop offset="1" stop-color="#959595"/>
</linearGradient>
</defs>
</svg>

                <span class="gradient-heading">WHAT VIEWERS THINK</span>
            </h2>
            <div class="summary-content">
                <div class="shimmer-line"></div>
                <div class="shimmer-line"></div>
                <div class="shimmer-line"></div>
            </div>
        `;
    }
    
    // Display the comment overview
    function displayCommentOverview(overview, sentiment) {
        const commentSection = document.getElementById('comment-section');
        if (!commentSection) return;
        
        // Process the overview to remove any JSON artifacts
        let cleanOverview = overview;
        
        // Remove ```json or ``` markers if they exist
        cleanOverview = cleanOverview.replace(/```json|```/g, '');
        
        // Remove "{ overview:" prefix if it exists (with or without quotes)
        cleanOverview = cleanOverview.replace(/^\s*{\s*overview:?\s*['"]?/i, '');
        
        // Remove trailing "} or '}" if it exists
        cleanOverview = cleanOverview.replace(/['"]?\s*}\s*$/i, '');
        
        // If it still looks like JSON, try to parse it
        if (cleanOverview.trim().startsWith('{') && cleanOverview.trim().endsWith('}')) {
            try {
                const jsonData = JSON.parse(cleanOverview);
                // If successful, use the overview property
                if (jsonData.overview) {
                    cleanOverview = jsonData.overview;
                }
            } catch (e) {
                console.error('Error parsing JSON in comment overview:', e);
                // If parsing fails, use the text as is after cleaning
            }
        }
        
        // Clean any remaining JSON-like artifacts
        cleanOverview = cleanOverview.replace(/{"overview":|"sentiment":|}/g, '');
        cleanOverview = cleanOverview.replace(/["']/g, ''); // Remove both single and double quotes
        
        // Determine the sentiment color
        let sentimentColor = getSentimentColor(sentiment);
        
        // Create the comment overview content with paragraphs
        const paragraphs = cleanOverview.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');
        
        commentSection.innerHTML = `
            <h2 class="summary-heading viewer-thoughts-heading">
                 <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.9229 5.104C11.4138 3.91217 10.5088 2.93269 9.36091 2.33114C8.21298 1.72959 6.89255 1.54288 5.62284 1.80257C4.35313 2.06227 3.21205 2.75244 2.3925 3.7564C1.57296 4.76036 1.12522 6.01652 1.125 7.31251V11.8125C1.125 12.1109 1.24353 12.397 1.4545 12.608C1.66548 12.819 1.95163 12.9375 2.25 12.9375H6.09398C6.53293 13.9399 7.25423 14.7929 8.16983 15.3922C9.08542 15.9915 10.1557 16.3113 11.25 16.3125H15.75C16.0484 16.3125 16.3345 16.194 16.5455 15.983C16.7565 15.772 16.875 15.4859 16.875 15.1875V10.6875C16.8747 9.31239 16.3707 7.98499 15.4583 6.9562C14.5458 5.92741 13.2881 5.2685 11.9229 5.104ZM15.75 15.1875H11.25C10.4543 15.1866 9.67297 14.9752 8.98538 14.5747C8.29779 14.1742 7.72839 13.599 7.335 12.9073C8.10543 12.8273 8.85101 12.589 9.52495 12.2072C10.1989 11.8255 10.7867 11.3085 11.2513 10.6888C11.716 10.0691 12.0476 9.36005 12.2252 8.60613C12.4028 7.85221 12.4227 7.06971 12.2836 6.30775C13.2703 6.5406 14.1494 7.0998 14.7786 7.89473C15.4077 8.68965 15.75 9.67374 15.75 10.6875V15.1875Z" fill="url(#paint0_linear_334_239)"/>
<defs>
<linearGradient id="paint0_linear_334_239" x1="9" y1="1.68848" x2="9" y2="16.3125" gradientUnits="userSpaceOnUse">
<stop stop-color="#B9B9B9"/>
<stop offset="1" stop-color="#959595"/>
</linearGradient>
</defs>
</svg>

                <span class="gradient-heading">WHAT VIEWERS THINK</span>
            </h2>
            <div class="sentiment-pill" style="background-color: ${sentimentColor}">
                ${sentiment.toUpperCase()}
            </div>
            <div class="summary-content">${paragraphs}</div>
        `;
    }
    
    // Initialize the extension
    setupNavigationDetection();
  })();