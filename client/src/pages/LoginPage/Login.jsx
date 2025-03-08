import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { ethers } from "ethers";
import { abi } from "../../EvidenceStorage.json";
import axios from "axios";
const CONTRACT_ADDRESS = "0x617266793a64Bdd2C72De4daDFEc8aD35B7227B4";
import { useUser } from "../../context/UserContext";

function Login() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { user, setUser } = useUser();

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
      { username, password, signature },
      {
        withCredentials: true,
      }
    );

    console.log(response);
    window.user = response.data.data.User;
    setUser(response.data.data.User[0]);
    console.log(window.user);
    if (response.data.success) navigate("/case/case_000");
  }
  return (
    <>
      <div className="blob blob1"></div>
      <div className="blob blob2"></div>
      <div className="blob blob3"></div>
      <div className="blob blob4"></div>
      <div className="Login-Containter">
        <h2 className="signin-text">SignIn</h2>
        <div className="Login-box">
          <div className="input-group">
            <input
              type="text"
              placeholder="Name/Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="input-group">
            <input
              type="text"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="terms">
            <input type="checkbox" id="terms" />
            <label htmlFor="terms">I agree for terms and conditions</label>
          </div>
          <button className="send-otp" onClick={login}>
            Signin
          </button>
        </div>
      </div>
    </>
  );
}

export default Login;
