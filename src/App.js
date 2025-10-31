import React, { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';
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

// CORS proxy function to route all fetch calls through a proxy
async function fetchWithCORSProxy(url, options = {}) {
  // List of CORS proxy services (in order of preference)
  const corsProxies = [
    // Jina Reader returns readable content without CORS; try both http/https prefixes
    'https://r.jina.ai/http://',
    'https://r.jina.ai/https://',
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/'
  ];
  
  // Try each proxy until one works
  for (const proxy of corsProxies) {
    try {
      console.log(`Trying CORS proxy: ${proxy}`);
      const proxyUrl = proxy.includes('jina.ai') ? (proxy + url.replace(/^https?:\/\//, '')) : (proxy + encodeURIComponent(url));
      
      const response = await fetch(proxyUrl, {
        ...options,
        mode: 'cors',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...options.headers
        }
      });
      
      if (response.ok) {
        console.log(`Successfully fetched via proxy: ${proxy}`);
        return response;
      }
    } catch (proxyError) {
      console.log(`Proxy ${proxy} failed:`, proxyError.message);
      continue;
    }
  }
  
  // If all proxies fail, try direct fetch as last resort
  console.log('All CORS proxies failed, trying direct fetch...');
  return fetch(url, {
    ...options,
    mode: 'cors',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...options.headers
    }
  });
}

// Extract article text from parent page or URL parameter (DISABLED - no auto-fetching)
/* async function getArticleText() {
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
    
    // Fetch the target page through CORS proxy
    const response = await fetchWithCORSProxy(parentUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const contentType = response.headers.get('content-type') || '';
    // If we received plain text (e.g., from Jina Reader), return directly
    if (!contentType.includes('text/html') && html && html.length > 100) {
      return { text: html, url: parentUrl };
    }
    
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
} */

function App() {
  // Treasury (main account to receive payments)
  const TREASURY_BASE58 = '5TWWTqFfnketLRyYAYWJZmdJGRMd8iuTPBY5U7gEAC4Z';
  const RPC_URL = 'https://solana-api.projectserum.com';
  const [wallet, setWallet] = useState(null); // base58 string
  const [providerPublicKeyObj, setProviderPublicKeyObj] = useState(null); // Phantom-provided PublicKey instance
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHashing, setIsHashing] = useState(false);
  const [articleText, setArticleText] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [isLoadingArticle, setIsLoadingArticle] = useState(true);
  const [articleError, setArticleError] = useState('');
  const [hashResult, setHashResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  // Validate and normalize a possible public key input into a base58 string
  const base58Alphabet = /^[1-9A-HJ-NP-Za-km-z]+$/;
  function normalizeWalletBase58(maybePk) {
    const asString = typeof maybePk === 'string'
      ? maybePk
      : (maybePk?.toBase58?.() || maybePk?.publicKey?.toBase58?.() || maybePk?.toString?.() || '');
    const trimmed = String(asString).trim();
    if (!trimmed || !base58Alphabet.test(trimmed)) {
      throw new Error('Wallet public key is not valid base58');
    }
    return trimmed;
  }

  // Bond curve pricing configuration
  const basePrice = 0.001; // SOL
  const priceMultiplier = 1.1;

  // On-chain count of prior hashes/payments to treasury
  const [hashCount, setHashCount] = useState(0);

  // Calculate bond curve price
  const calculateBondPrice = (count) => basePrice * Math.pow(priceMultiplier, count);

  // Fetch current count from chain (best-effort)
  const refreshHashCount = useCallback(async () => {
    try {
      const connection = new Connection(RPC_URL, 'confirmed');
      const treasury = new PublicKey(TREASURY_BASE58);
      const sigs = await connection.getSignaturesForAddress(treasury, { limit: 1000 });
      // Heuristic: count all historical txs touching treasury as hashes
      setHashCount(Array.isArray(sigs) ? sigs.length : 0);
    } catch (e) {
      console.warn('Failed to fetch hash count; defaulting to 0:', e?.message || e);
      setHashCount(0);
    }
  }, [TREASURY_BASE58]);

  // Load article from manual URL
  const loadFromUrl = async () => {
    if (!manualUrl.trim()) {
      setStatusMessage('Please enter a URL to load article from.');
      return;
    }

    try {
      setIsLoadingArticle(true);
      setArticleError('');
      setStatusMessage(`Loading article from: ${manualUrl}`);
      
      const result = await getArticleTextFromUrl(manualUrl);
      setArticleText(result.text);
      setVerificationUrl(result.url);
      setStatusMessage(`Successfully loaded article from: ${result.url}`);
    } catch (error) {
      console.error('Failed to load article from URL:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        url: manualUrl
      });
      
      let errorMessage = 'Couldn\'t retrieve article text from that URL. ';
      
      if (error.message.includes('404')) {
        errorMessage += 'The article page was not found (404 error). Please check the URL or try a different article.';
      } else if (error.message.includes('CORS')) {
        errorMessage += 'The website blocks cross-origin requests. Please try a different article or paste the content manually.';
      } else if (error.message.includes('_wp_link_placeholder')) {
        errorMessage += 'The URL contains WordPress placeholders. Please try the clean article URL without any placeholders.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error - the website may be down or unreachable. Please try again later.';
      } else {
        errorMessage += `Error: ${error.message}. Please try a different URL or paste the content manually.`;
      }
      
      setArticleError(errorMessage);
      setStatusMessage('Failed to load article from URL. Please try again.');
    } finally {
      setIsLoadingArticle(false);
    }
  };

  // Clean/normalize URL while preserving semantic trailing slash for article pages
  const cleanUrl = (url) => {
    try {
      const urlObj = new URL(url);
      
      // Remove common WordPress placeholders and malformed path segments
      let cleanPath = urlObj.pathname
        .replace(/_wp_link_placeholder/g, '')
        .replace(/\/+/g, '/'); // Remove multiple slashes

      // If path looks like a content slug (no file extension), ensure trailing slash
      const looksLikeSlug = !/\.[a-zA-Z0-9]{1,6}$/.test(cleanPath);
      if (looksLikeSlug && !cleanPath.endsWith('/')) {
        cleanPath = cleanPath + '/';
      }
      
      urlObj.pathname = cleanPath;
      return urlObj.toString();
    } catch (error) {
      console.error('Invalid URL:', url);
      return url; // Return original if parsing fails
    }
  };

  // Extract article text from specific URL
  const getArticleTextFromUrl = useCallback(async (url) => {
    // Clean the URL first
    const cleanUrlString = cleanUrl(url);
    console.log('Original URL:', url);
    console.log('Cleaned URL:', cleanUrlString);
    
    const response = await fetchWithCORSProxy(cleanUrlString);
    
    if (!response.ok) {
      // If cleaned URL fails, try the original URL
      if (cleanUrlString !== url) {
        console.log('Trying original URL as fallback...');
        const fallbackResponse = await fetchWithCORSProxy(url);
        
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
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && html && html.length > 100) {
      return { text: html, url: cleanUrlString };
    }
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
  }, []);

  // Load article text on component mount (only if URL parameter is provided)
  useEffect(() => {
    const loadArticleText = async () => {
      try {
        setIsLoadingArticle(true);
        setArticleError('');
        
        // Only check for URL parameter - no automatic fetching
        const urlParams = new URLSearchParams(window.location.search);
        const targetUrl = urlParams.get('url');
        
        if (targetUrl) {
          console.log('Loading from URL parameter:', targetUrl);
          setManualUrl(targetUrl);
          const result = await getArticleTextFromUrl(targetUrl);
          setArticleText(result.text);
          setVerificationUrl(result.url);
          setStatusMessage(`Successfully loaded article from: ${result.url}`);
        } else {
          // No automatic loading - just set placeholder
          setArticleText('Paste the article content here or enter a URL below...');
          setStatusMessage('Enter an article URL or paste content manually to get started.');
        }
      } catch (error) {
        console.error('Failed to load article:', error);
        setArticleError('Couldn\'t retrieve article text from that URL. Please try a different URL or paste the content manually.');
        setStatusMessage('Failed to load article from URL. Please try again.');
        setArticleText('Paste the article content here or enter a URL below...');
      } finally {
        setIsLoadingArticle(false);
      }
    };

    loadArticleText();
    // Also refresh price data on mount
    refreshHashCount();
  }, [getArticleTextFromUrl, refreshHashCount]);

  // Connect to Phantom wallet (fee payer = connected wallet)
  const connectWallet = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      setStatusMessage('Phantom wallet not found. Please install Phantom wallet.');
      return;
    }

    try {
      setIsConnecting(true);
      const response = await window.solana.connect();
      console.log('Phantom connection response:', response);
      console.log('PublicKey object (from provider):', response.publicKey);
      console.log('PublicKey type:', typeof response.publicKey);
      console.log('PublicKey methods:', Object.getOwnPropertyNames(response.publicKey));
      
      // Use provider object directly (avoids cross-bundle class mismatch)
      const pkString = response.publicKey.toBase58 ? response.publicKey.toBase58() : response.publicKey.toString();
      console.log('PublicKey string:', pkString);
      console.log('PublicKey string length:', pkString.length);
      
      // Store both the string and provider object
      setWallet(pkString);
      setProviderPublicKeyObj(response.publicKey);
      setStatusMessage('Wallet connected successfully!');
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setStatusMessage('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Hash article to blockchain (transfer + memo on mainnet)
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
      
      console.log('Wallet state:', { wallet, providerPublicKeyObj });
      console.log('Wallet type:', typeof wallet);
      console.log('providerPublicKeyObj type:', typeof providerPublicKeyObj);
      console.log('Wallet value:', wallet);
      console.log('providerPublicKeyObj value:', providerPublicKeyObj);

      // Generate SHA-256 hash
      const hash = await sha256(articleText);
      
      // Create real Solana transaction using imported web3.js
      const connection = new Connection(RPC_URL, 'confirmed');
      const treasuryPubkey = new PublicKey(TREASURY_BASE58);

      // Determine current price in lamports (0.001 SOL * 1.1^hashCount)
      const currentCount = hashCount || 0;
      const priceSol = calculateBondPrice(currentCount);
      const lamports = Math.floor(priceSol * 1e9);

      // Build transaction: transfer to treasury + memo with hash payload
      const transaction = new Transaction();

      // Resolve sender pubkey string consistently
      let walletPubKeyString;
      try {
        walletPubKeyString = normalizeWalletBase58(wallet || providerPublicKeyObj);
      } catch (e) {
        console.error('Invalid wallet base58:', e);
        setStatusMessage('Wallet key invalid. Please disconnect and reconnect Phantom.');
        setIsHashing(false);
        return;
      }
      // Build PublicKey from raw bytes to avoid cross-bundle constructor quirks
      let fromPubkey;
      try {
        const decoded = bs58.decode(walletPubKeyString);
        if (decoded.length !== 32) throw new Error('decoded length != 32');
        fromPubkey = new PublicKey(decoded);
      } catch (e) {
        console.error('Failed to construct PublicKey from base58 bytes:', e);
        setStatusMessage('Failed to prepare wallet key. Please reconnect Phantom.');
        setIsHashing(false);
        return;
      }

      // 1) Transfer instruction (payment)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPubkey,
          toPubkey: treasuryPubkey,
          lamports: lamports
        })
      );

      // 2) Memo instruction (hash + URL + price)
      const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysKcWfC85B2qXg');
      const memoPayload = JSON.stringify({
        v: 1,
        sha256: hash,
        url: verificationUrl || manualUrl || window.location.href,
        priceSol,
        ts: new Date().toISOString()
      });
      const memoBytes = new TextEncoder().encode(memoPayload);
      transaction.add(
        new TransactionInstruction({
          keys: [{ pubkey: fromPubkey, isSigner: true, isWritable: false }],
          programId: memoProgramId,
          data: memoBytes
        })
      );

      if (!providerPublicKeyObj || (!providerPublicKeyObj.toBase58 && !providerPublicKeyObj.toString)) {
        setStatusMessage('Wallet not properly connected. Please reconnect your wallet.');
        setIsHashing(false);
        return;
      }

      const { blockhash } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Request wallet to sign and send transaction
      const { signature } = await window.solana.signAndSendTransaction(transaction);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      setHashResult({
        hash: hash,
        url: verificationUrl,
        transactionId: signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}`
      });

      setStatusMessage('Article successfully hashed to blockchain!');
      // Refresh price based on new on-chain state (best-effort)
      try { await refreshHashCount(); } catch (_) {}
    } catch (error) {
      console.error('Hashing failed:', error);
      
      if (error.message.includes('User rejected')) {
        setStatusMessage('Transaction was cancelled by user.');
      } else if (error.message.includes('Insufficient funds')) {
        setStatusMessage('Insufficient SOL balance. Please add some SOL to your wallet.');
      } else {
        setStatusMessage(`Failed to hash article: ${error.message}`);
      }
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

            {/* URL Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500', 
                color: '#374151' 
              }}>
                Enter article URL to load content:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://nobot.news/article"
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
              
              {/* Test URLs */}
              <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#6b7280' }}>
                <div style={{ marginBottom: '8px' }}>Try these test URLs:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    onClick={() => setManualUrl('https://httpbin.org/html')}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Test HTML
                  </button>
                  <button
                    onClick={() => setManualUrl('https://jsonplaceholder.typicode.com/posts/1')}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Test JSON
                  </button>
                  <button
                    onClick={() => setManualUrl('https://nobot.news')}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    nobot.news
                  </button>
                </div>
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
              {isHashing ? 'Creating Blockchain Transaction...' : `Hash Article to Blockchain (${currentPrice.toFixed(4)} SOL)`}
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
