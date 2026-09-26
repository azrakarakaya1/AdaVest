// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AdaVest SliceAuction
/// @notice Startups sell equity slices through live Dutch auctions paid in native MON.
///         Token id = round id; holding n units of `roundId` means owning n slices of that round.
contract SliceAuction is ERC1155, Ownable, ReentrancyGuard {
    struct Round {
        address founder; // receives the money
        string name; // startup name
        string metadataURI; // optional: logo/description
        uint16 sliceBps; // equity per slice in basis points (100 = 1%)
        uint32 totalSlices;
        uint32 slicesSold;
        uint256 startPrice; // wei
        uint256 floorPrice; // price never goes below this
        uint256 decayPerSecond; // price drop per second
        uint64 startTime;
    }

    uint16 public constant MAX_FEE_BPS = 1_000; // 10%

    uint16 public feeBps = 250; // 2.5%
    address public treasury;

    Round[] private _rounds;

    event RoundCreated(
        uint256 indexed roundId,
        address indexed founder,
        string name,
        uint32 totalSlices,
        uint256 startPrice,
        uint256 floorPrice,
        uint64 startTime
    );
    event SliceBought(uint256 indexed roundId, address indexed buyer, uint256 price, uint32 sliceIndex);
    event RoundSoldOut(uint256 indexed roundId);
    event FeeUpdated(uint16 feeBps);
    event TreasuryUpdated(address treasury);

    error InvalidParams();
    error RoundNotFound();
    error NotStarted();
    error SoldOut();
    error Underpaid(uint256 price, uint256 sent);
    error TransferFailed();

    constructor(address treasury_) ERC1155("") Ownable(msg.sender) {
        if (treasury_ == address(0)) revert InvalidParams();
        treasury = treasury_;
    }

    // ---------------------------------------------------------------- founder

    function createRound(
        string calldata name,
        string calldata metadataURI,
        uint16 sliceBps,
        uint32 totalSlices,
        uint256 startPrice,
        uint256 floorPrice,
        uint256 decayPerSecond,
        uint64 startDelay
    ) external returns (uint256 roundId) {
        if (
            bytes(name).length == 0 || sliceBps == 0 || totalSlices == 0
                || uint256(sliceBps) * totalSlices > 10_000 || startPrice == 0 || floorPrice > startPrice
        ) revert InvalidParams();

        roundId = _rounds.length;
        uint64 startTime = uint64(block.timestamp) + startDelay;
        _rounds.push(
            Round({
                founder: msg.sender,
                name: name,
                metadataURI: metadataURI,
                sliceBps: sliceBps,
                totalSlices: totalSlices,
                slicesSold: 0,
                startPrice: startPrice,
                floorPrice: floorPrice,
                decayPerSecond: decayPerSecond,
                startTime: startTime
            })
        );
        emit RoundCreated(roundId, msg.sender, name, totalSlices, startPrice, floorPrice, startTime);
    }

    // ---------------------------------------------------------------- investor

    function buy(uint256 roundId) external payable nonReentrant {
        Round storage r = _round(roundId);
        if (block.timestamp < r.startTime) revert NotStarted();
        if (r.slicesSold >= r.totalSlices) revert SoldOut();

        uint256 price = currentPrice(roundId);
        if (msg.value < price) revert Underpaid(price, msg.value);

        // effects
        uint32 sliceIndex = r.slicesSold;
        r.slicesSold = sliceIndex + 1;
        _mint(msg.sender, roundId, 1, "");

        // interactions
        uint256 fee = (price * feeBps) / 10_000;
        _send(treasury, fee);
        _send(r.founder, price - fee);
        _send(msg.sender, msg.value - price);

        emit SliceBought(roundId, msg.sender, price, sliceIndex);
        if (r.slicesSold == r.totalSlices) emit RoundSoldOut(roundId);
    }

    // ---------------------------------------------------------------- views

    function currentPrice(uint256 roundId) public view returns (uint256) {
        Round storage r = _round(roundId);
        if (block.timestamp <= r.startTime) return r.startPrice;
        uint256 drop = r.decayPerSecond * (block.timestamp - r.startTime);
        if (drop >= r.startPrice - r.floorPrice) return r.floorPrice;
        return r.startPrice - drop;
    }

    function getRound(uint256 roundId) external view returns (Round memory) {
        return _round(roundId);
    }

    function roundCount() external view returns (uint256) {
        return _rounds.length;
    }

    function uri(uint256 roundId) public view override returns (string memory) {
        return _round(roundId).metadataURI;
    }

    // ---------------------------------------------------------------- admin

    function setFee(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert InvalidParams();
        feeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidParams();
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    // ---------------------------------------------------------------- internal

    function _round(uint256 roundId) private view returns (Round storage) {
        if (roundId >= _rounds.length) revert RoundNotFound();
        return _rounds[roundId];
    }

    function _send(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
