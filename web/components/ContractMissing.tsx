export function ContractMissing() {
  return (
    <div className="card p-6 text-sm text-mute">
      <p className="font-medium text-white">Contract address not configured</p>
      <p className="mt-2">
        Deploy the contract (see README), then set <code className="text-sage">NEXT_PUBLIC_CONTRACT_ADDRESS</code> in{" "}
        <code className="text-sage">web/.env.local</code> and restart the dev server.
      </p>
    </div>
  );
}
