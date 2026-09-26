import { isAddress, type Address } from "viem";
import { sliceAuctionAbi } from "./abi";

const raw = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

/** Deployed SliceAuction address, or undefined if NEXT_PUBLIC_CONTRACT_ADDRESS is not set. */
export const CONTRACT_ADDRESS: Address | undefined = isAddress(raw) ? raw : undefined;

export const auction = { address: CONTRACT_ADDRESS, abi: sliceAuctionAbi } as const;

export type Round = {
  founder: Address;
  name: string;
  metadataURI: string;
  sliceBps: number;
  totalSlices: number;
  slicesSold: number;
  startPrice: bigint;
  floorPrice: bigint;
  decayPerSecond: bigint;
  startTime: bigint;
};

export type RoundWithId = Round & { id: number };
