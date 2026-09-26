// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AdaVestAuction} from "../src/AdaVestAuction.sol";

contract AdaVestAuctionTest is Test {
    AdaVestAuction auction;

    address treasury = makeAddr("treasury");
    address founder = makeAddr("founder");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant START = 1 ether;
    uint256 constant FLOOR = 0.1 ether;
    uint256 constant DECAY = 0.01 ether; // floor reached after 90 s

    function setUp() public {
        auction = new AdaVestAuction(treasury);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function _create(uint32 slices, uint64 delay) internal returns (uint256 id) {
        vm.prank(founder);
        id = auction.createRound("Acme", "", 100, slices, START, FLOOR, DECAY, delay);
    }

    // ---------------------------------------------------------------- price

    function test_PriceIsStartPriceBeforeStart() public {
        uint256 id = _create(10, 60);
        assertEq(auction.currentPrice(id), START);
        skip(59);
        assertEq(auction.currentPrice(id), START);
    }

    function test_PriceDecaysOverTime() public {
        uint256 id = _create(10, 0);
        assertEq(auction.currentPrice(id), START);
        skip(10);
        assertEq(auction.currentPrice(id), START - 10 * DECAY);
        skip(40);
        assertEq(auction.currentPrice(id), START - 50 * DECAY);
    }

    function test_PriceNeverBelowFloor() public {
        uint256 id = _create(10, 0);
        skip(90);
        assertEq(auction.currentPrice(id), FLOOR);
        skip(10_000);
        assertEq(auction.currentPrice(id), FLOOR);
    }

    function testFuzz_PriceBounded(uint32 elapsed) public {
        uint256 id = _create(10, 0);
        skip(elapsed);
        uint256 p = auction.currentPrice(id);
        assertLe(p, START);
        assertGe(p, FLOOR);
    }

    // ---------------------------------------------------------------- buy

    function test_BuySplitsMoney() public {
        uint256 id = _create(10, 0);
        skip(20);
        uint256 price = START - 20 * DECAY; // 0.8 ether
        uint256 fee = (price * 250) / 10_000;
        uint256 aliceBefore = alice.balance;

        vm.prank(alice);
        auction.buy{value: price + 0.5 ether}(id);

        assertEq(treasury.balance, fee);
        assertEq(founder.balance, price - fee);
        assertEq(alice.balance, aliceBefore - price); // excess refunded
        assertEq(address(auction).balance, 0);
    }

    function test_BuyMintsOneSlice() public {
        uint256 id = _create(10, 0);
        vm.prank(alice);
        auction.buy{value: START}(id);
        assertEq(auction.balanceOf(alice, id), 1);
        assertEq(auction.getRound(id).slicesSold, 1);
    }

    function test_BuyEmitsEvent() public {
        uint256 id = _create(10, 0);
        vm.expectEmit(true, true, false, true);
        emit AdaVestAuction.SliceBought(id, alice, START, 0);
        vm.prank(alice);
        auction.buy{value: START}(id);
    }

    function test_RevertWhen_BuyBeforeStart() public {
        uint256 id = _create(10, 60);
        vm.prank(alice);
        vm.expectRevert(AdaVestAuction.NotStarted.selector);
        auction.buy{value: START}(id);
    }

    function test_RevertWhen_SoldOut() public {
        uint256 id = _create(2, 0);
        vm.prank(alice);
        auction.buy{value: START}(id);

        vm.expectEmit(true, false, false, false);
        emit AdaVestAuction.RoundSoldOut(id);
        vm.prank(bob);
        auction.buy{value: START}(id);

        vm.prank(alice);
        vm.expectRevert(AdaVestAuction.SoldOut.selector);
        auction.buy{value: START}(id);
    }

    function test_RevertWhen_Underpaid() public {
        uint256 id = _create(10, 0);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AdaVestAuction.Underpaid.selector, START, START - 1));
        auction.buy{value: START - 1}(id);
    }

    function test_RevertWhen_RoundMissing() public {
        vm.expectRevert(AdaVestAuction.RoundNotFound.selector);
        auction.buy{value: 1 ether}(42);
    }

    // ---------------------------------------------------------------- admin

    function test_SetFeeCapped() public {
        auction.setFee(500);
        assertEq(auction.feeBps(), 500);
        vm.expectRevert(AdaVestAuction.InvalidParams.selector);
        auction.setFee(1_001);
    }

    function test_OnlyOwnerAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        auction.setFee(100);
        vm.prank(alice);
        vm.expectRevert();
        auction.setTreasury(alice);
    }

    function test_RevertWhen_InvalidRoundParams() public {
        vm.startPrank(founder);
        vm.expectRevert(AdaVestAuction.InvalidParams.selector);
        auction.createRound("X", "", 100, 10, 1 ether, 2 ether, 1, 0); // floor > start
        vm.expectRevert(AdaVestAuction.InvalidParams.selector);
        auction.createRound("X", "", 5_000, 3, 1 ether, 0, 1, 0); // > 100% equity
        vm.stopPrank();
    }
}
