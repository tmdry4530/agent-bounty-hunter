require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    monad: {
      url: process.env.MONAD_RPC_URL || "https://rpc.monad.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 41454,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      monad: process.env.MONAD_API_KEY || "",
    },
  },
};
