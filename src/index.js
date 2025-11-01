import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import './index.css';
import App from './App';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Configure RPC endpoint (mainnet) - using Alchemy RPC endpoint
// Alchemy provides reliable, high-performance RPC access
// Get API key from environment variable (fallback to default if not set)
const alchemyApiKey = process.env.REACT_APP_ALCHEMY_API_KEY || 'dcEQkupbRm09NKETBbc9f';
const endpoint = `https://solana-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;

// Let WalletProvider auto-detect standard wallets (including Phantom)
// Pass empty array to avoid filter error - WalletProvider will auto-detect
const wallets = [];

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);
