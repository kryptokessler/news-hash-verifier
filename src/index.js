import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import './index.css';
import App from './App';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Configure RPC endpoint (mainnet) - using public RPC that doesn't require API keys
// Endpoint options (in order of preference):
// - https://api.mainnet.solana.com (official Solana mainnet, no beta suffix)
// - https://solana.public-rpc.com (public RPC aggregator)
// - https://rpc.ankr.com/solana (requires API key for some methods)
const endpoint = 'https://api.mainnet.solana.com';

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
