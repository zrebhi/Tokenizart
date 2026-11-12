// Network configuration for BNB Smart Chain Testnet
const BSC_TESTNET_CHAIN_ID = 97;
const BSC_TESTNET_HEX = "0x61";

// Contract Configuration
const CONTRACT_ADDRESS = "0x954f059376A80327408cBfd6CC7CDC296c4994C4";
const BSC_PUBLIC_RPC = "https://data-seed-prebsc-1-s1.bnbchain.org:8545/";

const BSC_TESTNET_PARAMS = {
  chainId: BSC_TESTNET_HEX,
  chainName: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: [BSC_PUBLIC_RPC],
  blockExplorerUrls: ["https://testnet.bscscan.com"]
};

// Human-Readable ABI for read operations & ownership checks
const CONTRACT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function owner() view returns (address)",
  "function safeMint(address to, string uri)"
];

// UI Elements
const connectBtn = document.getElementById("connectBtn");
const networkWarning = document.getElementById("networkWarning");
const switchNetworkBtn = document.getElementById("switchNetworkBtn");
const recipientInput = document.getElementById("recipientAddress");
const totalSupplyDisplay = document.getElementById("totalSupplyDisplay");
const tokenSymbolDisplay = document.getElementById("tokenSymbolDisplay");
const mintBtn = document.getElementById("mintBtn");
const mintStatus = document.getElementById("mintStatus");
const mintForm = document.getElementById("mintForm");
const metadataUriInput = document.getElementById("metadataURI");

let provider;
let contractRead;
let userAddress = null;

async function initContract() {
  // Gasless Public Reader: Works immediately for all visitors
  const publicProvider = new ethers.JsonRpcProvider(BSC_PUBLIC_RPC);
  contractRead = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, publicProvider);

  await loadContractStats();
}

// Fetch on-chain parameters via gasless eth_call
async function loadContractStats() {
  try {
    const [name, symbol, supply] = await Promise.all([
      contractRead.name(),
      contractRead.symbol(),
      contractRead.totalSupply()
    ]);

    tokenSymbolDisplay.textContent = `${name} (${symbol})`;
    totalSupplyDisplay.textContent = supply.toString();
  } catch (err) {
    console.error("Failed to read contract state:", err);
    totalSupplyDisplay.textContent = "Error";
  }
}

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

async function init() {
  await initContract();
  await initWallet();
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
    mintBtn.disabled = true;
    mintStatus.textContent = "";
    return;
  }

  userAddress = accounts[0];
  connectBtn.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
  
  if (recipientInput) {
    recipientInput.value = userAddress;
  }

  await checkNetwork();
  await verifyContractOwner();
}

// Check if active account matches contract owner
async function verifyContractOwner() {
  if (!userAddress || !contractRead) return;

  try {
    const ownerAddress = await contractRead.owner();
    if (ownerAddress.toLowerCase() === userAddress.toLowerCase()) {
      mintBtn.disabled = false;
      mintStatus.textContent = "Wallet verified as Contract Owner.";
      mintStatus.className = "status-msg success";
    } else {
      mintBtn.disabled = true;
      mintStatus.textContent = "Connected account is not the contract owner (safeMint is restricted).";
      mintStatus.className = "status-msg error";
    }
  } catch (err) {
    console.error("Failed to verify owner:", err);
  }
}

async function checkNetwork() {
  if (!provider) return;
  const network = await provider.getNetwork();
  
  if (Number(network.chainId) !== BSC_TESTNET_CHAIN_ID) {
    networkWarning.style.display = "flex";
  } else {
    networkWarning.style.display = "none";
  }
}

async function switchNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_TESTNET_HEX }]
    });
  } catch (error) {
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [BSC_TESTNET_PARAMS]
        });
      } catch (addError) {
        console.error("Failed to add BSC Testnet to wallet:", addError);
      }
    } else {
      console.error("Failed to switch network:", error);
    }
  }
}

// Execute on-chain safeMint transaction via connected owner wallet
async function handleMint(event) {
  event.preventDefault();

  if (!provider || !userAddress) {
    mintStatus.textContent = "Please connect your wallet first.";
    mintStatus.className = "status-msg error";
    return;
  }

  const recipient = recipientInput.value.trim();
  const metadataURI = metadataUriInput.value.trim();

  if (!ethers.isAddress(recipient) || !metadataURI) {
    mintStatus.textContent = "Enter a valid recipient address and metadata URI.";
    mintStatus.className = "status-msg error";
    return;
  }

  try {
    mintBtn.disabled = true;
    mintStatus.textContent = "Confirm transaction in MetaMask...";
    mintStatus.className = "status-msg";

    const signer = await provider.getSigner();
    const contractWrite = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const tx = await contractWrite.safeMint(recipient, metadataURI);
    mintStatus.textContent = `Transaction sent (${tx.hash.slice(0, 10)}...). Waiting for block confirmation...`;

    await tx.wait();

    mintStatus.textContent = "Token minted successfully!";
    mintStatus.className = "status-msg success";
    metadataUriInput.value = "";

    await loadContractStats();
  } catch (err) {
    console.error("Minting failed:", err);
    mintStatus.textContent = err.code === "ACTION_REJECTED"
      ? "Transaction rejected in MetaMask."
      : `Mint failed: ${err.reason || err.message}`;
    mintStatus.className = "status-msg error";
  } finally {
    mintBtn.disabled = false;
  }
}

connectBtn.addEventListener("click", connectWallet);
switchNetworkBtn.addEventListener("click", switchNetwork);
if (mintForm) mintForm.addEventListener("submit", handleMint);

window.addEventListener("DOMContentLoaded", init);
