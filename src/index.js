import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import './index.css';
import App from './App';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Configure RPC endpoint (mainnet) - using Alchemy RPC endpoint
// Alchemy provides reliable, high-performance RPC access
const endpoint = 'https://solana-mainnet.g.alchemy.com/v2/dcEQkupbRm09NKETBbc9f';

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
