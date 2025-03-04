require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: [
        "0xcf91fd0c50d74cf51c092fb636708208a0e22e8b0bd09b18ba46127e51318475",
      ],
    },
  },
  solidity: "0.8.28",
};
