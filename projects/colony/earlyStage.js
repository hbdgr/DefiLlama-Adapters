const ADDRESSES = require('../helper/coreAssets.json');

/// Get project nests addresses
async function getProjectNests(api, projectNestFactory) {
  const totalNests = Number(await api.call({
    abi: "uint256:projectNestsLength",
    target: projectNestFactory,
  }))

  const nests = []
  const limit = 100
  for (let i = 0; i < totalNests; i += limit) {
    const offset = i

    const n = await api.call({
      abi: "function getProjectNests(uint256 limit, uint256 offset) external view returns (address[] memory result)",
      target: projectNestFactory,
      params: [limit, offset]
    })
    nests.push(...n)
  }
  return nests
}

/// Accumulated early stage USD investments in the project nests
async function earlyStageInvestments(api, nests) {
  const stablecoins = await api.multiCall({  abi: 'address:supportedStablecoin', calls: nests})
  await api.sumTokens({ tokensAndOwners2: [stablecoins, nests]})
}

/// Project Tokens locaked in the early stage project vesting contracts
async function earlyStageProjectTokenVestings(api, nests) {
  const vestings = (await api.multiCall({ abi: 'address:vestingContract', calls: nests }))
    .filter(v => v !== ADDRESSES.null) // filter out not ready vesting contracts

  if (vestings.length === 0) {
    return
  }

  const projectTokens = await api.multiCall({ abi: 'address:projectToken', calls: vestings })
  await api.sumTokens({ tokensAndOwners2: [projectTokens, vestings]})
}

/// Early Stage TVL
function earlyStage(projectNestFactory) {
  return async (api) => {
    const nests = await getProjectNests(api, projectNestFactory);

    await earlyStageInvestments(api, nests);
    await earlyStageProjectTokenVestings(api, nests);

    return api.getBalances()
  }
}

module.exports = {
  earlyStage,
}
