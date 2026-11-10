// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenizeArt42
 * @dev Implementation of an ERC-721 / BEP-721 compliant NFT for 42 School.
 * Allows the contract owner to mint unique tokens with IPFS-hosted metadata.
 */
contract TokenizeArt42 is ERC721URIStorage, Ownable {
    // Sequential counter to assign unique IDs to each minted NFT
    uint256 private _nextTokenId;

    // Emitted whenever a new NFT is successfully created
    event NFTMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI);

    /**
     * @dev Initializes the contract by setting the Token Name, Symbol, and deployer ownership.
     * The name includes '42' as required by the subject specifications.
     */
    constructor() ERC721("TokenizeArt42", "TA42") Ownable(msg.sender) {}

    /**
     * @notice Mints a new NFT with an immutable IPFS metadata URI.
     * @dev Restricted to the contract owner to prevent unauthorized creation.
     * @param recipient The wallet address that will receive the minted NFT.
     * @param metadataURI The decentralized IPFS URI (ipfs://<CID>) containing the JSON metadata.
     * @return tokenId The unique token ID assigned to the minted NFT.
     */
    function safeMint(address recipient, string memory metadataURI) public onlyOwner returns (uint256) {
        require(recipient != address(0), "Cannot mint to zero address");
        require(bytes(metadataURI).length > 0, "URI cannot be empty");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        // Safely mint the token to the recipient address
        _safeMint(recipient, tokenId);

        // Associate the token ID with its specific IPFS metadata JSON
        _setTokenURI(tokenId, metadataURI);

        emit NFTMinted(recipient, tokenId, metadataURI);

        return tokenId;
    }

    /**
     * @notice Helper function returning the total count of minted NFTs.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
}