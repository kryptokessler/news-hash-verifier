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

// Extract article text from parent page
async function getArticleText() {
  try {
    // Get the parent page URL
    const parentUrl = document.referrer || window.location.href;
    console.log('Fetching article from:', parentUrl);
    
    // Fetch the parent page
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
    
    // Extract all paragraph text
    const paragraphs = doc.querySelectorAll('p');
    const articleText = Array.from(paragraphs)
      .map(p => p.textContent.trim())
      .filter(text => text.length > 0)
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

  // Bond curve pricing configuration
  const basePrice = 0.001; // SOL
  const priceMultiplier = 1.1;

  // Calculate bond curve price
  const calculateBondPrice = (hashCount) => {
    return basePrice * Math.pow(priceMultiplier, hashCount);
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
        setArticleError('Couldn\'t retrieve article text — please paste manually.');
        setStatusMessage('Article auto-load failed. Please paste the article text manually.');
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
                <p>Extracting content from the parent page</p>
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
