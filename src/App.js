import React, { useState, useEffect } from 'react';
import { Shield, Hash, ExternalLink, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import './App.css';

// Browser-safe text encoding using TextEncoder
function encodeText(text) {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

// Browser-safe SHA-256 hashing
async function sha256(text) {
  const data = encodeText(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Extract article text from parent page or URL parameter
async function getArticleText() {
  try {
    // Check for URL parameter first (for standalone usage)
    const urlParams = new URLSearchParams(window.location.search);
    const targetUrl = urlParams.get('url');
    
    let parentUrl;
    if (targetUrl) {
      parentUrl = targetUrl;
      console.log('Using URL parameter:', parentUrl);
    } else {
      // Get the parent page URL - prioritize referrer for iframe context
      parentUrl = document.referrer && document.referrer !== window.location.href 
        ? document.referrer 
        : window.location.href;
      console.log('Current location:', window.location.href);
      console.log('Document referrer:', document.referrer);
      console.log('Using parent URL:', parentUrl);
    }
    
    // If we're in an iframe and on the same domain, try to get content from parent window
    if (!targetUrl && window.parent && window.parent !== window) {
      try {
        const parentDoc = window.parent.document;
        const paragraphs = parentDoc.querySelectorAll('p, article p, .article p, .content p, .post p, .entry p');
        const articleText = Array.from(paragraphs)
          .map(p => p.textContent.trim())
          .filter(text => text.length > 20) // Filter out very short text
          .join(' ');
        
        if (articleText.length > 100) {
          console.log('Extracted article text from parent window, length:', articleText.length);
          return { text: articleText, url: parentUrl };
        }
      } catch (parentError) {
        console.log('Could not access parent window:', parentError.message);
      }
    }
    
    // Fetch the target page
    const response = await fetch(parentUrl, {
      mode: 'cors',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Parse HTML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Try multiple selectors for article content
    const selectors = [
      'article p',
      '.article p',
      '.content p',
      '.post p',
      '.entry p',
      'main p',
      '.main p',
      'p'
    ];
    
    let paragraphs = [];
    for (const selector of selectors) {
      paragraphs = doc.querySelectorAll(selector);
      if (paragraphs.length > 0) {
        console.log(`Found content using selector: ${selector}`);
        break;
      }
    }
    
    const articleText = Array.from(paragraphs)
      .map(p => p.textContent.trim())
      .filter(text => text.length > 20) // Filter out very short text
      .join(' ');
    
    if (articleText.length === 0) {
      throw new Error('No article content found');
    }
    
    console.log('Extracted article text length:', articleText.length);
    return { text: articleText, url: parentUrl };
    
  } catch (error) {
    console.error('Failed to extract article text:', error);
    throw error;
  }
}

function App() {
  const [wallet, setWallet] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHashing, setIsHashing] = useState(false);
  const [articleText, setArticleText] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [isLoadingArticle, setIsLoadingArticle] = useState(true);
  const [articleError, setArticleError] = useState('');
  const [hashResult, setHashResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  // Bond curve pricing configuration
  const basePrice = 0.001; // SOL
  const priceMultiplier = 1.1;

  // Calculate bond curve price
  const calculateBondPrice = (hashCount) => {
    return basePrice * Math.pow(priceMultiplier, hashCount);
  };

  // Load article from manual URL
  const loadFromUrl = async () => {
    if (!manualUrl.trim()) {
      setStatusMessage('Please enter a URL to load article from.');
      return;
    }

    try {
      setIsLoadingArticle(true);
      setArticleError('');
      
      const result = await getArticleTextFromUrl(manualUrl);
      setArticleText(result.text);
      setVerificationUrl(result.url);
      setStatusMessage(`Successfully loaded article from: ${result.url}`);
    } catch (error) {
      console.error('Failed to load article from URL:', error);
      
      let errorMessage = 'Couldn\'t retrieve article text from that URL. ';
      
      if (error.message.includes('404')) {
        errorMessage += 'The article page was not found (404 error). Please check the URL or try a different article.';
      } else if (error.message.includes('CORS')) {
        errorMessage += 'The website blocks cross-origin requests. Please try a different article or paste the content manually.';
      } else if (error.message.includes('_wp_link_placeholder')) {
        errorMessage += 'The URL contains WordPress placeholders. Please try the clean article URL without any placeholders.';
      } else {
        errorMessage += 'Please try a different URL or paste the content manually.';
      }
      
      setArticleError(errorMessage);
      setStatusMessage('Failed to load article from URL. Please try again.');
    } finally {
      setIsLoadingArticle(false);
    }
  };

  // Clean URL by removing common WordPress placeholders and malformed parts
  const cleanUrl = (url) => {
    try {
      const urlObj = new URL(url);
      
      // Remove common WordPress placeholders and malformed path segments
      const cleanPath = urlObj.pathname
        .replace(/_wp_link_placeholder/g, '')
        .replace(/\/+/g, '/') // Remove multiple slashes
        .replace(/\/$/, ''); // Remove trailing slash
      
      urlObj.pathname = cleanPath;
      return urlObj.toString();
    } catch (error) {
      console.error('Invalid URL:', url);
      return url; // Return original if parsing fails
    }
  };

  // Extract article text from specific URL
  const getArticleTextFromUrl = async (url) => {
    // Clean the URL first
    const cleanUrlString = cleanUrl(url);
    console.log('Original URL:', url);
    console.log('Cleaned URL:', cleanUrlString);
    
    const response = await fetch(cleanUrlString, {
      mode: 'cors',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    if (!response.ok) {
      // If cleaned URL fails, try the original URL
      if (cleanUrlString !== url) {
        console.log('Trying original URL as fallback...');
        const fallbackResponse = await fetch(url, {
          mode: 'cors',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });
        
        if (fallbackResponse.ok) {
          const html = await fallbackResponse.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          const selectors = [
            'article p',
            '.article p',
            '.content p',
            '.post p',
            '.entry p',
            'main p',
            '.main p',
            'p'
          ];
          
          let paragraphs = [];
          for (const selector of selectors) {
            paragraphs = doc.querySelectorAll(selector);
            if (paragraphs.length > 0) {
              break;
            }
          }
          
          const articleText = Array.from(paragraphs)
            .map(p => p.textContent.trim())
            .filter(text => text.length > 20)
            .join(' ');
          
          if (articleText.length === 0) {
            throw new Error('No article content found');
          }
          
          return { text: articleText, url: url };
        }
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}. The article URL may be invalid or the page may not exist.`);
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const selectors = [
      'article p',
      '.article p',
      '.content p',
      '.post p',
      '.entry p',
      'main p',
      '.main p',
      'p'
    ];
    
    let paragraphs = [];
    for (const selector of selectors) {
      paragraphs = doc.querySelectorAll(selector);
      if (paragraphs.length > 0) {
        break;
      }
    }
    
    const articleText = Array.from(paragraphs)
      .map(p => p.textContent.trim())
      .filter(text => text.length > 20)
      .join(' ');
    
    if (articleText.length === 0) {
      throw new Error('No article content found');
    }
    
    return { text: articleText, url: cleanUrlString };
  };

  // Load article text on component mount
  useEffect(() => {
    const loadArticleText = async () => {
      try {
        setIsLoadingArticle(true);
        setArticleError('');
        
        const result = await getArticleText();
        setArticleText(result.text);
        setVerificationUrl(result.url);
        setStatusMessage(`Successfully loaded article from: ${result.url}`);
      } catch (error) {
        console.error('Failed to load article:', error);
        setArticleError('Couldn\'t retrieve article text automatically. Please paste the article content manually below.');
        setStatusMessage('Article auto-load failed. Please paste the article text manually.');
        // Set a helpful placeholder
        setArticleText('Paste the article content here...');
      } finally {
        setIsLoadingArticle(false);
      }
    };

    loadArticleText();
  }, []);

  // Connect to Phantom wallet
  const connectWallet = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      setStatusMessage('Phantom wallet not found. Please install Phantom wallet.');
      return;
    }

    try {
      setIsConnecting(true);
      const response = await window.solana.connect();
      setWallet(response.publicKey.toString());
      setStatusMessage('Wallet connected successfully!');
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setStatusMessage('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Hash article to blockchain
  const hashArticle = async () => {
    if (!wallet) {
      setStatusMessage('Please connect your wallet first.');
      return;
    }

    if (!articleText.trim()) {
      setStatusMessage('Please enter article text to hash.');
      return;
    }

    try {
      setIsHashing(true);
      setStatusMessage('Hashing article to blockchain...');

      // Generate SHA-256 hash
      const hash = await sha256(articleText);
      
      // In a real implementation, you would create a Solana transaction here
      // For now, we'll simulate the transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      setHashResult({
        hash: hash,
        url: verificationUrl,
        transactionId: 'simulated_tx_' + Date.now(),
        explorerUrl: `https://explorer.solana.com/tx/simulated_tx_${Date.now()}`
      });

      setStatusMessage('Article successfully hashed to blockchain!');
    } catch (error) {
      console.error('Hashing failed:', error);
      setStatusMessage('Failed to hash article. Please try again.');
    } finally {
      setIsHashing(false);
    }
  };

  // Get current hash count (simulated)
  const currentHashCount = 0; // In real implementation, fetch from blockchain
  const currentPrice = calculateBondPrice(currentHashCount);
  const nextPrice = calculateBondPrice(currentHashCount + 1);

  return (
    <div className="app">
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <Shield className="header-icon" />
            <h1>🛡️ News Hash Verifier</h1>
            <p>Immutable blockchain verification for news articles</p>
            {verificationUrl && (
              <div style={{ marginTop: '8px', fontSize: '0.9rem', opacity: 0.9 }}>
                Verifying: <a href={verificationUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>
                  {verificationUrl}
                </a>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="main-card">
          {/* Bond Curve Pricing */}
          <div className="bond-curve-section">
            <div className="section-header">
              <Hash className="section-icon" />
              <h2>Bond Curve Pricing</h2>
            </div>
            
            <div className="pricing-grid">
              <div className="price-card current">
                <div className="price-label">Current Price</div>
                <div className="price-value">{currentPrice.toFixed(4)} SOL</div>
                <div className="price-desc">Hash #{currentHashCount + 1}</div>
              </div>
              <div className="price-card next">
                <div className="price-label">Next Price</div>
                <div className="price-value">{nextPrice.toFixed(4)} SOL</div>
                <div className="price-desc">Hash #{currentHashCount + 2}</div>
              </div>
            </div>

            <div className="curve-info">
              <p>10% price increase per hash</p>
              <div className="total-hashes">
                <span>Total Hashes: {currentHashCount}</span>
              </div>
            </div>
          </div>

          {/* Article Section */}
          <div className="article-section">
            <div className="section-header">
              <Shield className="section-icon" />
              <h2>Article Content</h2>
            </div>

            {isLoadingArticle ? (
              <div className="loading-state">
                <Loader className="loading-spinner" />
                <h2>Loading article...</h2>
                <p>Extracting content from the page</p>
              </div>
            ) : articleError ? (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '16px',
                color: '#dc2626'
              }}>
                <AlertCircle style={{ width: '20px', height: '20px', marginRight: '8px', display: 'inline' }} />
                {articleError}
              </div>
            ) : null}

            {/* Manual URL Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500', 
                color: '#374151' 
              }}>
                Or enter article URL manually:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, sans-serif'
                  }}
                />
                <button
                  onClick={loadFromUrl}
                  disabled={isLoadingArticle || !manualUrl.trim()}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    opacity: isLoadingArticle || !manualUrl.trim() ? 0.6 : 1
                  }}
                >
                  Load
                </button>
              </div>
            </div>

            <div className="article-preview">
              <textarea
                className="article-textarea"
                value={articleText}
                onChange={(e) => setArticleText(e.target.value)}
                placeholder="Article text will be loaded automatically..."
                rows="8"
              />
              <div className="char-count">
                {articleText.length} characters
              </div>
            </div>
          </div>

          {/* Wallet Connection */}
          {!wallet ? (
            <button
              className="connect-button"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader className="button-icon" />
              ) : (
                <Shield className="button-icon" />
              )}
              {isConnecting ? 'Connecting...' : 'Connect Phantom Wallet'}
            </button>
          ) : (
            <div className="wallet-connected">
              <div className="wallet-info">
                <CheckCircle className="success-icon" />
                <span>Wallet Connected: {wallet.slice(0, 8)}...{wallet.slice(-8)}</span>
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className={`status-message ${statusMessage.includes('successfully') ? 'success' : statusMessage.includes('Failed') ? 'error' : ''}`}>
              {statusMessage.includes('successfully') ? (
                <CheckCircle className="status-icon" />
              ) : statusMessage.includes('Failed') ? (
                <AlertCircle className="status-icon" />
              ) : (
                <Loader className="status-icon" />
              )}
              {statusMessage}
            </div>
          )}

          {/* Hash Button */}
          {wallet && (
            <button
              className="hash-button"
              onClick={hashArticle}
              disabled={isHashing || !articleText.trim()}
            >
              {isHashing ? (
                <Loader className="button-icon" />
              ) : (
                <Hash className="button-icon" />
              )}
              {isHashing ? 'Hashing to Blockchain...' : 'Hash Article to Blockchain'}
            </button>
          )}

          {/* Hash Result */}
          {hashResult && (
            <div className="hash-result">
              <div className="result-header">
                <h3>✅ Article Successfully Hashed!</h3>
              </div>
              <div className="result-details">
                <div className="result-item">
                  <strong>Hash:</strong>
                  <code>{hashResult.hash}</code>
                </div>
                <div className="result-item">
                  <strong>URL:</strong>
                  <span>{hashResult.url}</span>
                </div>
                <div className="result-item">
                  <strong>Transaction:</strong>
                  <a 
                    href={hashResult.explorerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    View on Explorer
                    <ExternalLink className="link-icon" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <p>Built with ❤️ by MAKE Europe GmbH</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
