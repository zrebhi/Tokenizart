// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TokenizeArt42OnChain
 * @dev Fully on-chain ERC-721 / BEP-721 NFT storing dynamic SVG artwork
 * and JSON metadata directly inside contract bytecode via Base64 Data URIs.
 */
contract TokenizeArt42OnChain is ERC721, Ownable {
    // Attaches OpenZeppelin's Strings library to uint256 so integers can call
    // .toString() directly (e.g., turning 0 into "0" for XML concatenation).
    using Strings for uint256;

    uint256 private _nextTokenId;

    // Deterministic accent palette cycled per tokenId
    string[4] private _accentColors = [
        "#F0B90B", // BNB Gold
        "#00F0FF", // Cyber Cyan
        "#FF4D6D", // Neon Crimson
        "#10B981"  // Matrix Emerald
    ];

    constructor() ERC721("TokenizeArt42OnChain", "TA42OC") Ownable(msg.sender) {}

    /**
     * @dev Generates deterministic SVG markup for a given tokenId and returns
     * a RFC-4648 Base64-encoded image Data URI.
     */
    function _generateSVG(uint256 tokenId) internal view returns (string memory) {
        string memory accent = _accentColors[tokenId % _accentColors.length];
        string memory idStr = tokenId.toString();

        // abi is a built-in Solidity global namespace; encodePacked concatenates
        // multiple strings end-to-end into tight bytes without 32-byte zero-padding.
        bytes memory svg = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">',
            '<rect width="400" height="400" fill="#0d1118"/>',
            '<rect x="20" y="20" width="360" height="360" rx="16" fill="none" stroke="', accent, '" stroke-width="3"/>',
            '<polygon points="200,65 265,135 200,115 135,135" fill="', accent, '" opacity="0.85"/>',
            '<text x="200" y="235" fill="#ffffff" font-family="monospace" font-size="84" font-weight="bold" text-anchor="middle">42</text>',
            '<text x="200" y="285" fill="', accent, '" font-family="monospace" font-size="16" letter-spacing="3" text-anchor="middle">TOKEN #', idStr, '</text>',
            '<text x="200" y="315" fill="', accent, '" font-family="monospace" font-size="16" letter-spacing="3" text-anchor="middle">ARTIST: ZREBHI</text>',
            '</svg>'
        );

        // Prepend the RFC-2397 Data URI header so browsers/wallets decode the
        // Base64 payload inline as SVG XML without making any external HTTP/IPFS request.
        // Base64.encode escapes XML characters (<, >, #, ") so the SVG safely nests inside JSON.
        return string(
            abi.encodePacked(
                "data:image/svg+xml;base64,",
                Base64.encode(svg)
            )
        );
    }
    event NFTMinted(address indexed recipient, uint256 indexed tokenId);

    function safeMint(address recipient) public onlyOwner returns (uint256) {
        require(recipient != address(0), "Cannot mint to zero address");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(recipient, tokenId);

        emit NFTMinted(recipient, tokenId);
        return tokenId;
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // Reverts with ERC721NonexistentToken if tokenId has not been minted yet
        _requireOwned(tokenId);

        string memory idStr = tokenId.toString();
        string memory imageUri = _generateSVG(tokenId);
        bytes  memory json = abi.encodePacked(
            '{"name":"42 - On-Chain Emblem #', idStr, '",',
            '"description":"Fully on-chain generative SVG NFT for 42 School and BNB Chain.",',
            '"artist":"zrebhi",',
            '"image":"', imageUri, '"}'
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(json)
            )
        );
    }
}
