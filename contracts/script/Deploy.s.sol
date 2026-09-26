// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {SliceAuction} from "../src/SliceAuction.sol";

/// Deploys SliceAuction. The deployer (AdaVest Platform wallet) becomes owner and treasury.
contract Deploy is Script {
    function run() external returns (SliceAuction auction) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        auction = new SliceAuction(deployer);
        vm.stopBroadcast();

        console.log("SliceAuction deployed at:", address(auction));
        console.log("Owner / treasury:", deployer);
    }
}
