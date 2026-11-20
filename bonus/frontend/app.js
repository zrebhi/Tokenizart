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
  "function safeMint(address to, string uri)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
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
const galleryGrid = document.getElementById("galleryGrid");

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

    await loadGallery(Number(supply));
  } catch (err) {
    console.error("Failed to read contract state:", err);
    totalSupplyDisplay.textContent = "Error";
  }
}

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

function resolveIpfsUri(uri) {
  if (!uri) return "";
  return uri.startsWith("ipfs://") ? `${IPFS_GATEWAY}${uri.slice(7)}` : uri;
}

// Fetch on-chain ownership/URI and off-chain JSON metadata for a single token
async function fetchTokenData(tokenId) {
  const [owner, rawTokenUri] = await Promise.all([
    contractRead.ownerOf(tokenId),
    contractRead.tokenURI(tokenId)
  ]);

  let metadata = {
    name: `Token #${tokenId}`,
    artist: "Unknown",
    image: ""
  };

  try {
    const metadataUrl = resolveIpfsUri(rawTokenUri);
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    metadata = {
      name: json.name || metadata.name,
      artist: json.artist || metadata.artist,
      image: resolveIpfsUri(json.image)
    };
  } catch (metaErr) {
    console.warn(`Metadata fetch failed for token #${tokenId}:`, metaErr);
  }

  return { tokenId, owner, ...metadata };
}

// Construct an XSS-safe .nft-card DOM element
function createNftCard(token) {
  const card = document.createElement("div");
  card.className = "nft-card";

  const img = document.createElement("img");
  img.src = token.image;
  img.alt = token.name;
  img.loading = "lazy";
  img.onerror = () => {
    img.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='100%' height='100%' fill='%230d1118'/><text x='50%' y='50%' fill='%238b949e' font-family='sans-serif' font-size='16' text-anchor='middle' dominant-baseline='middle'>Image Unavailable</text></svg>";
  };

  const info = document.createElement("div");
  info.className = "nft-info";

  const header = document.createElement("div");
  header.className = "nft-header";

  const title = document.createElement("h3");
  title.className = "nft-title";
  title.textContent = token.name;

  const idBadge = document.createElement("span");
  idBadge.className = "nft-id";
  idBadge.textContent = `#${token.tokenId}`;

  header.append(title, idBadge);

  const artist = document.createElement("p");
  artist.className = "nft-artist";
  artist.textContent = `Artist: ${token.artist}`;

  const owner = document.createElement("p");
  owner.className = "nft-owner";
  owner.textContent = `Owner: ${token.owner.slice(0, 6)}...${token.owner.slice(-4)}`;
  owner.title = token.owner;

  info.append(header, artist, owner);
  card.append(img, info);
  return card;
}

// Discover all minted tokens and render their cards into #galleryGrid
async function loadGallery(totalSupply) {
  if (!galleryGrid || !contractRead) return;

  if (totalSupply === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.className = "gallery-empty";
    emptyMsg.textContent = "No tokens minted yet.";
    galleryGrid.replaceChildren(emptyMsg);
    return;
  }

  try {
    const tokenIds = Array.from({ length: totalSupply }, (_, i) => i);
    const tokens = await Promise.all(tokenIds.map((id) => fetchTokenData(id)));
    const cards = tokens.map((token) => createNftCard(token));
    galleryGrid.replaceChildren(...cards);
  } catch (err) {
    console.error("Failed to load NFT gallery:", err);
    const errMsg = document.createElement("p");
    errMsg.className = "status-msg error";
    errMsg.textContent = "Failed to load collection gallery.";
    galleryGrid.replaceChildren(errMsg);
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
  await Promise.all([initContract(), initWallet()]);
}


// Request wallet connection (triggered by user click)
async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask to interact with this application.");
    return;
  }

  try {
    if (!provider) {
      provider = new ethers.BrowserProvider(window.ethereum);
    }
    const accounts = await provider.send("eth_requestAccounts", []);
    await handleAccountsChanged(accounts);
  } catch (err) {
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        console.warn("User rejected wallet connection.");
    } else {
      console.error("Failed to connect wallet:", err);
    }
  }
}

// Handle account change and network status
async function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    userAddress = null;
    connectBtn.textContent = "Connect Wallet";
    connectBtn.disabled = false;
    if (recipientInput) recipientInput.value = "";
    networkWarning.style.display = "none";
    mintBtn.disabled = true;
    mintStatus.textContent = "";
    return;
  }

  userAddress = accounts[0];
  connectBtn.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
  connectBtn.disabled = true; // Disable connect button after successful connection

  if (recipientInput) {
    recipientInput.value = userAddress;
  }

  const isCorrectNetwork = await checkNetwork();
  if (!isCorrectNetwork) {
    mintBtn.disabled = true;
    mintStatus.textContent = "Please switch to BNB Smart Chain Testnet to mint.";
    mintStatus.className = "status-msg error";
    return;
  }

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
  if (!provider) return false;
  const network = await provider.getNetwork();
  
  const isCorrectNetwork = Number(network.chainId) === BSC_TESTNET_CHAIN_ID;

  networkWarning.style.display = isCorrectNetwork ? "none" : "flex";
  return isCorrectNetwork;
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

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== BSC_TESTNET_CHAIN_ID) {
    mintBtn.disabled = true;
    mintStatus.textContent = "Please switch to BNB Smart Chain Testnet first.";
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

    mintStatus.textContent = "Token minted successfully! ";
    mintStatus.className = "status-msg success";
    const txLink = document.createElement("a");
    txLink.href = `${BSC_TESTNET_PARAMS.blockExplorerUrls[0]}/tx/${tx.hash}`;
    txLink.target = "_blank"; // Open in new tab
    txLink.rel = "noopener noreferrer"; // Security best practice when opening new tabs
    txLink.textContent = "View on BscScan";
    mintStatus.appendChild(txLink);
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
