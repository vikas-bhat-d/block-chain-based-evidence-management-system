import { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { create } from "ipfs-http-client";
import { abi } from "../EvidenceStorage.json";

const CONTRACT_ADDRESS = "0xc8ce5efF92DF8cBd8C06574593ca2f81f82F728C";
const ipfs = create({ host: "localhost", port: "5002", protocol: "http" });

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");

  useEffect(() => {
    connectWallet();
  }, []);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      console.log("contract set: ", contract);
      setProvider(provider);
      setSigner(signer);
      setContract(contract);

      const userAddress = await signer.getAddress();
      setAccount(userAddress);
    } catch (error) {
      console.error("Wallet Connection Error:", error);
    }
  }

  return (
    <Web3Context.Provider value={{ provider, signer, contract, account, ipfs }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  return useContext(Web3Context);
};
