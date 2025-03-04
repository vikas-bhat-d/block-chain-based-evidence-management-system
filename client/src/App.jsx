import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { create } from "ipfs-http-client";
import { abi } from "./EvidenceStorage.json";

const CONTRACT_ADDRESS = "0xD42F2af2c48afedbA38CCeB08355674B664ceb3c";

const ipfs = create({ host: "localhost", port: "5002", protocol: "http" });

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [caseId, setCaseId] = useState("");
  const [description, setDescription] = useState("");
  const [rootDirectories, setRootDirectories] = useState([]);

  useEffect(() => {
    connectWallet();
  }, []);

  const [events, setEvents] = useState([]);

  const fetchEvents = async () => {
    if (!contract) return;
    try {
      const eventLogs = await contract.queryFilter("*", 0, "latest");
      const formattedEvents = eventLogs.map((event) => ({
        name: event.event,
        block: event.blockNumber,
        args: event.args,
      }));
      setEvents(formattedEvents);
      console.log("📢 Events Fetched:", formattedEvents);
    } catch (error) {
      console.error("❌ Error Fetching Events:", error);
    }
  };

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

  async function createCase() {
    if (!contract || !caseId || !description) return;
    try {
      const tx = await contract.createCase(caseId, description);
      await tx.wait();
      alert(`Case ${caseId} Created!`);
    } catch (error) {
      console.error(error);
    }
  }

  // const processFile = async (file, parentId) => {
  //   const fileBuffer = await file.arrayBuffer();
  //   const fileUint8Array = new Uint8Array(fileBuffer);
  //   const { path: ipfsHash } = await ipfs.add(fileUint8Array);
  //   const sha256Hash = await calculateSHA256(file);
  //   const fileId = `F${Date.now()}${Math.random()}`;

  //   const tx = await contract.storeEvidence(
  //     caseId,
  //     parentId,
  //     fileId,
  //     file.name,
  //     ipfsHash,
  //     sha256Hash,
  //     file.type,
  //     false
  //   );
  //   await tx.wait();
  // };

  const processFile = async (file, parentId) => {
    if (!file || !contract) return;

    try {
      const fileBuffer = await file.arrayBuffer();
      const fileUint8Array = new Uint8Array(fileBuffer);
      const { path: ipfsHash } = await ipfs.add(fileUint8Array);
      const sha256Hash = await calculateSHA256(file);
      const fileId = `F${Date.now()}${Math.random()}`;

      const messageHash = await contract.getDataHash({
        caseId,
        id: fileId,
        name: file.name,
        ipfsHash,
        sha256Hash,
        mimeType: file.type,
        uploader: account,
        isFolder: false,
        parentId: parentId || "",
      });

      console.log("messageHash: ", messageHash);
      const signature = await signer.signMessage(ethers.getBytes(messageHash));

      console.log("signature: ", signature);

      const tx = await contract.storeEvidence(
        {
          caseId,
          id: fileId,
          name: file.name,
          ipfsHash,
          sha256Hash,
          mimeType: file.type,
          uploader: account,
          isFolder: false,
          parentId: parentId || "",
        },
        signature
      );
      await tx.wait();

      console.log("✅ File uploaded and stored on blockchain:", {
        fileId,
        ipfsHash,
      });
      return ipfsHash;
    } catch (error) {
      console.error("❌ Error Uploading File:", error);
    }
  };

  const handleSingleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    await processFile(file, "");
  };

  const handleFolderUpload = async (event) => {
    const files = event.target.files;
    const folderMap = {};

    for (const file of files) {
      const pathParts = file.webkitRelativePath.split("/");
      if (pathParts.length > 1) {
        const folderPath = pathParts.slice(0, -1).join("/");
        if (!folderMap[folderPath]) {
          const folderId = `FOLDER-${Date.now()}-${Math.random()}`;
          const tx = await contract.storeEvidence(
            caseId,
            "",
            folderId,
            pathParts[0],
            "",
            "",
            "",
            true
          );
          await tx.wait();
          folderMap[folderPath] = folderId;
        }
        await processFile(file, folderMap[folderPath]);
      } else {
        await processFile(file, "");
      }
    }

    alert("Folder & Files Uploaded Successfully!");
  };

  async function fetchRootDirectories() {
    if (!contract || !caseId) return;
    try {
      const rootFolders = await contract.getCaseRootContents(caseId);
      setRootDirectories(rootFolders);
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  }

  const handleBatchFolderUpload = async (event) => {
    const files = event.target.files;
    if (!files.length) return;

    const batchId = `BATCH-${Date.now()}`;
    let fileDataArray = [];
    let folderMap = {};

    for (const file of files) {
      const pathParts = file.webkitRelativePath.split("/");
      const fileName = pathParts.pop();
      const folderPath = pathParts.join("/");

      let parentId = "";

      if (folderPath) {
        if (!folderMap[folderPath]) {
          const folderId = `FOLDER-${Date.now()}-${Math.random()}`;
          folderMap[folderPath] = folderId;

          fileDataArray.push({
            caseId,
            id: folderId,
            name: pathParts[pathParts.length - 1] || "Root Folder",
            ipfsHash: "",
            sha256Hash: "",
            mimeType: "",
            uploader: account,
            isFolder: true,
            parentId: "",
          });
        }
        parentId = folderMap[folderPath];
      }

      const fileBuffer = await file.arrayBuffer();
      const fileUint8Array = new Uint8Array(fileBuffer);
      const ipfsResponse = await ipfs.add(fileUint8Array);
      const sha256Hash = await calculateSHA256(file);

      fileDataArray.push({
        caseId,
        id: `F${Date.now()}${Math.random()}`,
        name: fileName,
        ipfsHash: ipfsResponse.path,
        sha256Hash,
        mimeType: file.type,
        uploader: account,
        isFolder: false,
        parentId,
      });
    }

    console.log("Final Batch Data:", fileDataArray);

    // **Encode fileDataArray as a tuple array**
    const encodedFiles = fileDataArray.map((file) => [
      file.caseId,
      file.id,
      file.name,
      file.ipfsHash,
      file.sha256Hash,
      file.mimeType,
      file.uploader,
      file.isFolder,
      file.parentId,
    ]);

    const batchHash = await contract.getBatchDataHash(
      encodedFiles,
      batchId,
      account
    );

    console.log("Batch Hash:", batchHash);

    const signature = await signer.signMessage(ethers.getBytes(batchHash));

    console.log("Signature:", signature);

    try {
      const tx = await contract.storeBatchEvidence(
        encodedFiles,
        batchId,
        account,
        signature
      );
      await tx.wait();

      alert("Batch uploaded successfully!");
    } catch (error) {
      console.error("❌ Error Uploading Batch:", error);
    }
  };

  async function fetchFullFileTree() {
    if (!contract || !caseId) return;
    try {
      const fileIds = await contract.getFullCaseTree(caseId);
      const fileDetails = await Promise.all(
        fileIds.map(async (fileId) => {
          const fileData = await contract.evidenceRecords(fileId);
          return {
            id: fileData.id,
            name: fileData.name,
            isFolder: fileData.isFolder,
            parentId: fileData.parentId,
            ipfsHash: fileData.ipfsHash,
          };
        })
      );

      const tree = buildNestedTree(fileDetails);
      console.log("📂 Full File Tree:", tree);
    } catch (error) {
      console.error("Fetch Full File Tree Error:", error);
    }
  }

  function buildNestedTree(fileList) {
    const map = {};
    fileList.forEach((file) => {
      map[file.id] = { ...file, children: [] };
    });

    const tree = [];
    fileList.forEach((file) => {
      if (!file.parentId) {
        tree.push(map[file.id]);
      } else {
        if (map[file.parentId]) {
          map[file.parentId].children.push(map[file.id]);
        }
      }
    });

    return tree;
  }

  async function calculateSHA256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  return (
    <div>
      <h1>Blockchain Evidence Storage</h1>
      <p>Connected Account: {account}</p>

      <div>
        <h2>Create Case</h2>
        <input
          type="text"
          placeholder="Case ID"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button onClick={createCase}>Create</button>
      </div>

      <div>
        <h2>Upload Single File</h2>
        <input type="file" onChange={handleSingleFileUpload} />
      </div>

      <div>
        <h2>Upload Evidence</h2>
        <input
          type="file"
          multiple
          webkitdirectory="true"
          onChange={handleBatchFolderUpload}
        />
        <button onClick={handleBatchFolderUpload}>Upload Folder</button>
      </div>

      <div>
        <h2>Fetch Root Directories</h2>
        <button onClick={fetchRootDirectories}>Fetch Root Directories</button>
        <ul>
          {rootDirectories.map((dir, index) => (
            <li key={index}>{dir}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Fetch Full File Tree</h2>
        <button onClick={fetchFullFileTree}>Fetch File Tree</button>
      </div>

      <div>
        <h2>Fetch Events</h2>
        <button onClick={fetchEvents}>Fetch All Events</button>
        <ul>
          {events.map((event, index) => (
            <li key={index}>
              <strong>{event.name}</strong> - Block: {event.block}
              <pre>{JSON.stringify(event.args, null, 2)}</pre>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
