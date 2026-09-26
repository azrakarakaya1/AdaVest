// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {AdaVestAuction} from "../src/AdaVestAuction.sol";

/// Creates demo rounds from the Startup (founder) wallet.
/// Every round: 10 slices x 1% equity. Prices sized for 15 MON test wallets.
contract Seed is Script {
    function run() external {
        uint256 pk = vm.envUint("FOUNDER_PRIVATE_KEY");
        AdaVestAuction auction = AdaVestAuction(vm.envAddress("CONTRACT_ADDRESS"));

        vm.startBroadcast(pk);

        // Live right away, 2.0 -> 0.2 MON over 4 minutes
        _round(auction, "Bosphorus Robotics", 2 ether, 0.2 ether, 240, 0);
        // Live right away, 1.5 -> 0.3 MON over 5 minutes
        _round(auction, "Anatolia AgriTech", 1.5 ether, 0.3 ether, 300, 0);
        // Starts 60 s after seeding (for the video), 3.0 -> 0.5 MON over 3 minutes
        _round(auction, "Kapadokya Energy", 3 ether, 0.5 ether, 180, 60);

        vm.stopBroadcast();
        console.log("Rounds now:", auction.roundCount());
    }

    function _round(
        AdaVestAuction auction,
        string memory name,
        uint256 startPrice,
        uint256 floorPrice,
        uint256 duration,
        uint64 delay
    ) internal {
        uint256 decay = (startPrice - floorPrice) / duration;
        uint256 id = auction.createRound(name, "", 100, 10, startPrice, floorPrice, decay, delay);
        console.log("Created round", id, name);
    }
}
