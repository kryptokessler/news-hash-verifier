import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import './index.css';
import App from './App';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Configure RPC endpoint (mainnet) - using reliable public RPC
// Official endpoint: https://api.mainnet-beta.solana.com
// Alternative: https://rpc.ankr.com/solana (good free tier)
const endpoint = 'https://api.mainnet-beta.solana.com';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConnectionProvider endpoint={endpoint}>
      {/* WalletProvider auto-detects standard wallets like Phantom */}
      <WalletProvider autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);
