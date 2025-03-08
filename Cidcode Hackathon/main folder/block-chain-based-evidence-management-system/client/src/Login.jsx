import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { ethers } from "ethers";
import { abi } from "./EvidenceStorage.json";
import axios from "axios";
const CONTRACT_ADDRESS = "0xD0F2b91c8e0eB4a67C7aa6F08e0aDA4a6D04c2F9";

function Login() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    connectWallet();
  }, []);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

    setProvider(provider);
    setSigner(signer);
    setContract(contract);

    const userAddress = await signer.getAddress();
    setAccount(userAddress);
  }

  async function login() {
    // const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

    const messageHash = await contract.getLoginHash(
      username,
      password,
      account
    );

    console.log("Message hash: ", messageHash, typeof messageHash);

    console.log(signer.signMessage);
    let signature;
    try {
      console.log("trying to sign");
      signature = await signer.signMessage(ethers.getBytes(messageHash));
      console.log("✅ Signature:", signature);
    } catch (error) {
      console.error("❌ Signing Error:", error);
    }

    console.log("singned message:", signature);

    const response = await axios.post(
      "http://localhost:3000/api/v1/user/login",
      { username, password, signature }
    );

    console.log(response);
    if (response.data.success) navigate("/home");
  }
  return (
    <>
      <div>login</div>
      <input
        type="text"
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={login}>login</button>
    </>
  );
}

export default Login;
