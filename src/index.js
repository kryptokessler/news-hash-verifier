import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import './index.css';
import App from './App';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Configure RPC endpoint (mainnet) - using Ankr public RPC (better free tier, no 403 errors)
// Alternative endpoints if needed:
// - https://api.mainnet-beta.solana.com (official, but may have rate limits)
// - https://solana-api.projectserum.com (may timeout)
const endpoint = 'https://rpc.ankr.com/solana';

// Configure wallets - explicitly include Phantom
// Note: Phantom may be detected as a standard wallet, but explicit inclusion ensures compatibility
const wallets = [
  new PhantomWalletAdapter()
];

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
