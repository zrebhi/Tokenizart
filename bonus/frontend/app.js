// Network configuration for BNB Smart Chain Testnet
const BSC_TESTNET_CHAIN_ID = 97;
const BSC_TESTNET_HEX = "0x61";
const BSC_TESTNET_PARAMS = {
  chainId: BSC_TESTNET_HEX,
  chainName: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545/"],
  blockExplorerUrls: ["https://testnet.bscscan.com"],
};

// UI Elements
const connectBtn = document.getElementById("connectBtn");
const networkWarning = document.getElementById("networkWarning");
const switchNetworkBtn = document.getElementById("switchNetworkBtn");
const recipientInput = document.getElementById("recipientAddress");

let provider;
let userAddress = null;

// Initialize wallet bindings and listeners
async function initWallet() {
  if (!window.ethereum) {
    connectBtn.textContent = "MetaMask Not Detected";
    connectBtn.disabled = true;
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);

  // Check if an account is already authorized
  const accounts = await provider.send("eth_accounts", []);
  if (accounts.length > 0) {
    await handleAccountsChanged(accounts);
  }

  // React to user switching accounts in MetaMask
  window.ethereum.on("accountsChanged", handleAccountsChanged);

  // Reload application when user changes network to keep state consistent
  window.ethereum.on("chainChanged", () => window.location.reload());
}

// Request wallet connection (triggered by user click)
async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask to interact with this application.");
    return;
  }

  try {
    const accounts = await provider.send("eth_requestAccounts", []);
    await handleAccountsChanged(accounts);
  } catch (err) {
    console.error("User rejected wallet connection:", err);
  }
}

// Handle account change and network status
async function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    userAddress = null;
    connectBtn.textContent = "Connect Wallet";
    if (recipientInput) recipientInput.value = "";
    networkWarning.style.display = "none";
    return;
  }

  userAddress = accounts[0];
  // Format address for compact display: 0x1234...abcd
  connectBtn.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;

  if (recipientInput) {
    recipientInput.value = userAddress;
  }

  await checkNetwork();
}

// Verify that the connected chain matches BSC Testnet
async function checkNetwork() {
  if (!provider) return;
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== BSC_TESTNET_CHAIN_ID) {
    networkWarning.style.display = "flex";
  } else {
    networkWarning.style.display = "none";
  }
}

// Switch wallet network to BSC Testnet, or prompt to add it if missing
async function switchNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_TESTNET_HEX }],
    });
  } catch (error) {
    // Error code 4902 indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [BSC_TESTNET_PARAMS],
        });
      } catch (addError) {
        console.error("Failed to add BSC Testnet to wallet:", addError);
      }
    } else {
      console.error("Failed to switch network:", error);
    }
  }
}

// Event Listeners
connectBtn.addEventListener("click", connectWallet);
switchNetworkBtn.addEventListener("click", switchNetwork);

window.addEventListener("DOMContentLoaded", initWallet);
