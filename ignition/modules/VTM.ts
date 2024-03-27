import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

module.exports = buildModule("VoteMaxToken", (m) => {
  const VTM_contract = m.contract("VoteMaxToken")
  // m.call(VTM_contract, "", [])
  return { VTM_contract };
});
