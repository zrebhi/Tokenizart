# TokenizeArt42 — Decentralized Art NFT

A fully compliant BEP-721 / ERC-721 Non-Fungible Token (NFT) deployed on the BNB Smart Chain (BSC) Testnet as part of the 42 School curriculum in partnership with BNB Chain.

The project tokenizes an original artwork: the **Cybernetic Eagle**, integrating the number **42** within the visual composition, anchored immutably via decentralized IPFS storage, and governed by an OpenZeppelin-secured smart contract.

---

## Project Overview

* **Token Name:** `TokenizeArt42`
* **Token Symbol:** `TA42`
* **Standard:** BEP-721 / ERC-721
* **Network:** BNB Smart Chain Testnet
* **Chain ID:** `97`
* **Contract Address:** [`0x954f059376A80327408cBfd6CC7CDC296c4994C4`](https://testnet.bscscan.com/address/0x954f059376A80327408cBfd6CC7CDC296c4994C4#code)
* **Artist / Intra Login:** `zrebhi`

---

## Key Design & Architectural Choices

### 1. Blockchain Selection: BNB Smart Chain Testnet
* **EVM Compatibility:** Full parity with the Ethereum Virtual Machine allows the contract to be written in standard Solidity (`^0.8.20`) and leverage audited OpenZeppelin libraries.
* **Throughput & Low Latency:** BSC's Proof of Staked Authority (PoSA) consensus produces ~3-second block times, facilitating immediate transaction confirmation during evaluation.
* **Cost Efficiency:** Minimal gas requirements allow deployment, minting, and transfer operations to execute seamlessly without prohibitive overhead.

### 2. Token Standard: BEP-721 via OpenZeppelin v5
* **Base Implementation (`ERC721`):** Manages balances, non-fungible ownership records, approvals, and safe transfers.
* **Metadata Extension (`ERC721URIStorage`):** Provides granular, per-token URI storage (`_setTokenURI`) rather than a rigid uniform base-URI structure, allowing individual metadata pinning per minted asset.
* **Access Control (`Ownable`):** Restricts administrative functions (`safeMint`) strictly to the deployer address (`msg.sender`), preventing unauthorized supply inflation.
* **Defensive Asset Safety (`_safeMint`):** Prevents accidental asset loss by checking if the recipient is a contract; if so, it requires the recipient to implement `IERC721Receiver.onERC721Received` before completing the mint.

### 3. Decentralized Storage: IPFS via Pinata
To maintain complete decentralization while avoiding high on-chain gas costs, the project implements a **two-tier resolution chain**:

$$\text{Smart Contract} \longrightarrow \text{Metadata JSON (IPFS)} \longrightarrow \text{Artwork Binary (IPFS)}$$

* **Content Addressing (CID):** Unlike mutable HTTP location addresses, IPFS multihashes serve as cryptographic proofs of file integrity. Any alteration to the metadata or the underlying image changes the CID, making post-mint fraud impossible.
* **Gas Rationale:** Storing megabytes of binary image data on-chain is cost-prohibitive and bloats blockchain state. Storing a lightweight URI string on-chain keeps execution fast and inexpensive while guaranteeing asset persistence off-chain.
* **Dual Resolution Demonstration:**
  * **Token ID `0` (Decentralized Protocol Purity):** Minted with raw `ipfs://<METADATA_CID>` and pointing to an `ipfs://<IMAGE_CID>` payload for strict compliance with decentralized protocol standards.
  * **Token ID `1` (Ecosystem Interoperability):** Minted using HTTPS gateway URIs (`https://gateway.pinata.cloud/ipfs/...`) to bypass browser extension Content Security Policies (CSP) and testnet indexing limitations, rendering the visual artwork natively inside the MetaMask wallet interface.

---

## Repository Structure

```text
.
├── README.md                           # Project overview, architectural choices, and execution guide
├── code/
│   └── TokenizeArt42.sol               # Smart contract source code (Solidity ^0.8.20)
├── deployment/
│   ├── deployment_info.json            # Deployment parameters, network details, and compiler specs
├── mint/
│   ├── mint_info.json                  # Transaction records, token IDs, and recipient details
└── documentation/
    └── documentation.md                # Comprehensive technical whitepaper and security analysis
```

---

## Minted Tokens Summary

| Token ID | Token URI | Resolution Scheme | Primary Role |
| :---: | :--- | :--- | :--- |
| **0** | `ipfs://bafkreietgailfjgtvsv46o7tbj26xik7ldfkcxztrmm5hnktt24si2jgga` | Native IPFS Protocol | Academic compliance & decentralized immutability proof |
| **1** | `https://gateway.pinata.cloud/ipfs/bafkreietgailfjgtvsv46o7tbj26xik7ldfkcxztrmm5hnktt24si2jgga` | HTTPS Gateway Proxy | Native wallet rendering & MetaMask client compatibility |

---

## Verification & On-Chain Interaction

The contract is verified and publicly accessible on the **BNB Smart Chain Testnet Explorer**:

* **Explorer Address:** [View on BscScan](https://testnet.bscscan.com/address/0x954f059376A80327408cBfd6CC7CDC296c4994C4#code)
* **Primary Mint Transaction:** [`0x819e2826f0c650ffc8108889447135319f6f11e20d7f294938a53875f653828d`](https://testnet.bscscan.com/tx/0x819e2826f0c650ffc8108889447135319f6f11e20d7f294938a53875f653828d)

### Reading State from BscScan
Under the **Contract > Read Contract** tab:
1. `name()` $\rightarrow$ Returns `"TokenizeArt42"`
2. `symbol()` $\rightarrow$ Returns `"TA42"`
3. `totalSupply()` $\rightarrow$ Returns `2`
4. `ownerOf(0)` $\rightarrow$ Returns the owner address
5. `tokenURI(0)` $\rightarrow$ Returns the IPFS metadata URI
6. `tokenURI(1)` $\rightarrow$ Returns the gateway metadata URI