# TokenizeArt42 — Technical Whitepaper & Project Documentation

**Project Name:** TokenizeArt42  
**Token Symbol:** TA42  
**Contract Standard:** BEP-721 / ERC-721 (Non-Fungible Token)  
**Network:** BNB Smart Chain Testnet (Chain ID: 97)  
**Contract Address:** `0x954f059376A80327408cBfd6CC7CDC296c4994C4`  
**Mint Transaction (Token 0):** `0x819e2826f0c650ffc8108889447135319f6f11e20d7f294938a53875f653828d`  
**Artist / Creator:** `zrebhi`  

---

## 1. Project Concept & Asset Representation

TokenizeArt42 is a decentralized digital asset deployed on BNB Smart Chain Testnet as part of the 42 School and BNB Chain partnership curriculum. The project establishes an immutable, non-fungible asset representing a high-technology mechanical avian entity: the **Cybernetic Eagle**.

### Visual & Semantic Constraints
- **Numerical Constraint:** The artwork cleanly integrates the number **42** within the mechanical wing plating, satisfying identification and project requirements without visual obstruction.
- **Content Rules:** The visual representation adheres strictly to evaluation requirements, containing no offensive or copyrighted material.
- **Decentralized Storage:** The primary asset payloads (image binary and descriptive metadata) are hosted across the InterPlanetary File System (IPFS) and pinned via Pinata.

---

## 2. System Architecture & Resolution Pathways

The contract architecture implements a two-tier indirection model (`Smart Contract -> Metadata JSON -> Image Binary`). Because real-world Web3 client software (wallets, explorers, dApps) varies in its ability to resolve decentralized protocols natively, the project implements and demonstrates **two complementary URI resolution strategies**.

```text
+-----------------------------------------------------------------------------+
|                     CLIENT / EXPLORER / WALLET (Off-Chain)                  |
+----------------------+--------------------------------+---------------------+
                       |                                |
                       | 1. Call tokenURI(id)           | 2. Request JSON
                       |    (Returns URI string)        | 3. Request Image
                       v                                v
+---------------------------------------+   +---------------------------------+
|            BNB SMART CHAIN            |   |   IPFS (Decentralized Storage)  |
|                                       |   |                                 |
|  TokenizeArt42.sol                    |   |  CID: <METADATA_CID>            |
|  ─────────────────                    |   |  └── metadata.json              |
|  • Token 0: "ipfs://<CID>"            |   |        ├── name: "42 - ..."     |
|  • Token 1: "https://gateway.../<CID>"|   |        ├── artist: "zrebhi"     |
|  • ownerOf(id): 0x<OwnerAddress>      |   |        └── image: (IPFS/HTTPS)  |
|                                       |   |                     │           |
|                                       |   |  CID: <IMAGE_CID> <─┘           |
|                                       |   |  └── <IMAGE_FILE>               |
+---------------------------------------+   +---------------------------------+
```

### Strategy A: Pure Decentralized Protocol (`ipfs://`) — Token ID 0
- **Format:** `ipfs://<METADATA_CID>`
- **Metadata Image Field:** `ipfs://<IMAGE_CID>`
- **Design Principle:** Strict decentralized purity. The smart contract remains completely agnostic to third-party web infrastructure or gateway domain names.
- **Client Resolution:** Requires a client with a built-in IPFS daemon (e.g., Brave browser, native IPFS node). Standard browser extensions may fall back to placeholder graphics due to missing native IPFS resolvers (i.e Metamask).

### Strategy B: Gateway-Compatible HTTPS Scheme (`https://`) — Token ID 1
- **Format:** `https://gateway.pinata.cloud/ipfs/<METADATA_CID>`
- **Metadata Image Field:** `https://gateway.pinata.cloud/ipfs/<IMAGE_CID>`
- **Design Principle:** Maximum ecosystem interoperability. Leverages secure HTTP gateways while maintaining underlying content addressing.
- **Client Resolution:** Browser extensions like MetaMask, web dApps, and non-Web3 browsers treat the URI as a standard secure HTTPS endpoint. This bypasses client-side Content Security Policy (CSP) protocol restrictions and renders the image directly inside the MetaMask user interface on custom testnets without requiring centralized marketplace indexers.

---

## 3. Metadata Specification

The metadata adheres to the ERC-721 Metadata JSON Schema, complemented by the required fields:

```json
{
  "name": "42 - Cybernetic Eagle",
  "description": "TokenizeArt project for 42 School and BNB Chain.",
  "image": "https://gateway.pinata.cloud/ipfs/bafybeihw3rdtli4if55g33ydkzm57vvcvtuomvunbrwnnmkdtcneatswr4",
  "artist": "zrebhi"
}
```

### Field Definitions
- `name`: Identifies the token; strictly includes the number 42 and the project title (`42 - Cybernetic Eagle`).
- `description`: Plain-text description detailing the asset and partnership scope.
- `image`: URI pointing directly to the pinned image CID (either via `ipfs://` or the HTTPS gateway).
- `artist`: Explicit creator identifier set to intra login `zrebhi`.

---

## 4. Smart Contract Implementation

The contract is written in Solidity `^0.8.20` and inherits from OpenZeppelin Contracts (v5.x).

### 4.1 Inheritance Tree
- **`ERC721`:** Base non-fungible token implementation handling balances, transfers, and ownership mappings.
- **`ERC721URIStorage`:** Extension providing dynamic, individual `tokenURI` mappings per token ID via `_setTokenURI`.
- **`Ownable`:** Restricts administrative capabilities exclusively to the deployer address (`msg.sender`).

### 4.2 Core Interface

#### `safeMint(address recipient, string memory metadataURI) -> uint256`
- **Visibility:** `public`
- **Modifier:** `onlyOwner`
- Increments `_nextTokenId`, runs internal safety checks (`recipient != address(0)`), mints the token via `_safeMint`, assigns the metadata string via `_setTokenURI`, and emits the `NFTMinted` event.

#### `ownerOf(uint256 tokenId) -> address`
- **Visibility:** `public view`
- Returns the current legal owner of the specified token ID, fulfilling the subject's explicit ownership verification requirement.

#### `tokenURI(uint256 tokenId) -> string`
- **Visibility:** `public view`
- Returns the stored metadata URI string for the requested token ID.

#### `totalSupply() -> uint256`
- **Visibility:** `external view`
- Returns the cumulative count of tokens minted by the contract instance.

---

## 5. Security & Risk Analysis

### 5.1 Minting Access Control
All mint operations are guarded by `onlyOwner`. Unauthorized accounts calling `safeMint` revert immediately, preventing unauthorized token generation and supply inflation.

### 5.2 Prevention of Stranded Assets (`_safeMint` vs. `_mint`)
Calling standard `_mint` directly transfers ownership without verifying whether the recipient address is capable of handling ERC-721 tokens. If the recipient is a contract without receive logic, the token is permanently trapped. 

`_safeMint` verifies if the target address is a contract by inspecting bytecode size. If code exists, it triggers `IERC721Receiver.onERC721Received` on the recipient and verifies its return value. If the recipient fails to implement the interface, the transaction reverts and the NFT is never minted, safeguarding token assets against loss.

---

## 6. Prerequisites & How to Use the NFT

### 6.1 Viewing & Verifying (Read-Only, No Wallet Required)
* **Block Explorer:** Inspect contract state (`name`, `symbol`, `totalSupply`, `ownerOf`, `tokenURI`) directly under **Contract > Read Contract** on [BscScan Testnet](https://testnet.bscscan.com/address/0x954f059376A80327408cBfd6CC7CDC296c4994C4#readContract).
* **IPFS Gateways:** Resolve any returned CID via `https://gateway.pinata.cloud/ipfs/<CID>` or `https://ipfs.io/ipfs/<CID>`.
* **Local Web3 Gallery:** Serve `bonus/frontend/` locally (`python3 -m http.server 8080`) to load all minted tokens automatically via public BSC Testnet RPC.

### 6.2 Interacting, Transferring & Minting (Write Operations)
1. **Install a Web3 Wallet:** Install [MetaMask](https://metamask.io/) (browser extension or mobile).
2. **Add BNB Smart Chain Testnet:**
   * **Network Name:** BNB Smart Chain Testnet
   * **RPC URL:** `https://data-seed-prebsc-1-s1.bnbchain.org:8545/`
   * **Chain ID:** `97`
   * **Currency Symbol:** `tBNB`
   * **Block Explorer:** `https://testnet.bscscan.com`
3. **Fund with Testnet Gas:** Obtain free `tBNB` from the official BNB Chain Testnet Faucet (no real funds are ever required).
4. **Display in MetaMask:** Open the **NFTs** tab, click **Import NFT**, enter contract address `0x954f059376A80327408cBfd6CC7CDC296c4994C4`, and specify Token ID `1` or `2` (HTTPS gateway URIs render natively).
5. **Mint a New Token (Contract Owner Only):** Pin the artwork and ERC-721 metadata JSON to IPFS (e.g., via Pinata), then invoke `safeMint(recipient, metadataURI)` from the deployer wallet using Remix IDE, BscScan **Write Contract**, or the `bonus/frontend/` minting panel.

---

## 7. Verification and Evaluation Demonstration

### Test Matrix

| Check | Action | Expected Output |
| :--- | :--- | :--- |
| **Contract Name** | Call `name()` on BscScan | `"TokenizeArt42"` |
| **Contract Symbol** | Call `symbol()` on BscScan | `"TA42"` |
| **Total Supply** | Call `totalSupply()` on BscScan | `>= 3` |
| **Token 0 Owner** | Call `ownerOf(0)` on BscScan | Deployer / Owner address |
| **Token 0 URI** | Call `tokenURI(0)` on BscScan | `ipfs://<CID>` (Decentralized purity) |
| **Token 1 Owner** | Call `ownerOf(1)` on BscScan | Deployer / Owner address |
| **Token 1 URI** | Call `tokenURI(1)` on BscScan | `https://gateway.pinata.cloud/ipfs/<CID>` |
| **MetaMask Rendering** | View Token 1 or 2 in MetaMask | Artwork renders natively in UI |

### Demonstration Steps During Peer Defense
1. **On-Chain Code & State:** Open BscScan Testnet at `0x954f059376A80327408cBfd6CC7CDC296c4994C4` to demonstrate that the contract is verified and functions (`ownerOf`, `totalSupply`) respond correctly.
2. **Metadata Inspection:** Open the metadata URI in the browser to confirm the JSON contains `artist: "zrebhi"` and a `name` including `42` and a title.
3. **Artwork Display:**
   - Demonstrate Token ID `1` (or `2`) displaying directly in the MetaMask extension wallet.
   - Demonstrate the artwork resolving directly from IPFS gateways (`ipfs.io` or `gateway.pinata.cloud`) and via the live gallery in `bonus/frontend/`.

---

## 8. Bonus Extensions

### 8.1 Web3 Frontend dApp (`bonus/frontend/`)
A zero-build vanilla HTML/CSS/JS interface using **Ethers.js v6** that reads `totalSupply()`, `ownerOf()`, and `tokenURI()` through a public BSC Testnet RPC (gasless `eth_call`), resolves both `ipfs://` and `https://` metadata URIs into an XSS-safe gallery, enforces Chain ID `97` in MetaMask, and exposes owner-gated `safeMint()` execution.

### 8.2 Fully On-Chain Inscriptions (`bonus/onchain/TokenizeArt42OnChain.sol`)
Deployed at `0xFf1ecE5a8E14c9B23B5967C78181A08f86075894` on BSC Testnet (symbol `TA42OC`), this standalone ERC-721 contract eliminates IPFS entirely:
* **Storage vs. Memory:** Drops `ERC721URIStorage` so `safeMint(address recipient)` avoids per-token `SSTORE` URI gas costs, computing XML and JSON dynamically in temporary EVM `memory` during free `view` calls.
* **Nested Base64 Encoding:** `_generateSVG(tokenId)` builds deterministic SVG vector artwork (featuring `42` and `ARTIST: ZREBHI`) and encodes it as `data:image/svg+xml;base64,...` so XML double quotes cannot break the outer JSON syntax. `tokenURI(tokenId)` enforces `_requireOwned(tokenId)` and returns the complete payload as `data:application/json;base64,...`.
* **Zero External Dependencies:** Browsers and MetaMask decode both JSON metadata and SVG artwork inline without HTTP gateways or IPFS pinning.
