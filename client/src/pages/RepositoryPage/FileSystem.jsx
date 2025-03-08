import { useEffect, useState } from "react";
import "./FileSystem.css"; // Import the modern styled CSS
import { useWeb3 } from "../../context/Web3Context";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import { useUser } from "../../context/UserContext";
import axios from "axios";

const FileSystem = () => {
  const [currentPath, setCurrentPath] = useState([]);
  const { id: caseId } = useParams();
  const { provider, signer, contract, account, ipfs } = useWeb3();
  const [fsTree, setFsTree] = useState([]);
  const [fileintegrity, setFileIntegrity] = useState({});

  const { user, setUser } = useUser();

  const [evidenceCreatedEvent, setEvidenceCreatedEvent] = useState([]);
  const [lastModified, setLastModified] = useState(null);

  function getTimeAgo(date) {
    const now = Math.floor(Date.now() / 1000);
    const timestamp = Math.floor(date.getTime() / 1000);
    const diff = now - timestamp;

    console.log(diff);

    if (diff < 60) return `${Math.round(diff)} seconds ago`;
    if (diff < 3600) return `${Math.round(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
    if (diff < 172800) return `yesterday`;
    return `${Math.round(diff / 86400)} days ago`;
  }

  useEffect(() => {
    async function request() {
      if (!user) {
        console.log("request sent");
        const response = await axios.get("http://localhost:3000/api/v1/user/", {
          withCredentials: true,
        });
        console.log(response.data);
        setUser(response.data);
      }
      console.log("filter:", contract?.filters);
      const filter = contract?.filters.EvidenceStored();

      const events = await contract?.queryFilter(filter, 0, "latest");

      setEvidenceCreatedEvent(events);
      console.log(events);
      events.map((event) => {
        // console.log(event);
        console.log(
          "timestamp: ",
          new Date(Number(event.args.timestamp) * 1000)
        );
      });

      const timeAgo = getTimeAgo(
        new Date(Number(events[events.length - 1].args.timestamp) * 1000)
      );
      setLastModified((prev) => timeAgo);
    }
    request();
    console.log("user: ", user);
  }, [user, contract]);

  const [openFileDialougue, setOpenFileDialougue] = useState(false);

  async function fetchFullFileTree() {
    if (!contract || !caseId) return;
    try {
      const fileIds = await contract.getFullCaseTree(caseId);
      console.log("contract:", contract, fileIds);

      const fileDetails = await Promise.all(
        fileIds.map(async (fileId) => {
          const fileData = await contract.evidenceRecords(fileId);
          return {
            id: fileData.id,
            name: fileData.name,
            isFolder: fileData.isFolder,
            parentId: fileData.parentId,
            ipfsHash: fileData.ipfsHash,
            sha256Hash: fileData.sha256Hash,
            mimeType: fileData.mimeType,
            uploader: fileData.uploader,
            caseId: fileData.caseId,
            description: fileData.description,
            timestamp: getTimeAgo(new Date(Number(fileData.timestamp) * 1000)),
          };
        })
      );

      const tree = buildNestedTree(fileDetails);
      setFsTree(tree);
      console.log("📂 Full File Tree:", tree);
    } catch (error) {
      console.error("Fetch Full File Tree Error:", error);
    }
  }

  async function calculateSHA256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
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

  useEffect(() => {
    const fetchData = async () => {
      console.log("Function called");
      await fetchFullFileTree();
    };
    fetchData();
  }, [contract, caseId]);

  const navigateTo = (folder) => {
    setCurrentPath([...currentPath, folder]);
  };

  const goBack = () => {
    setCurrentPath(currentPath.slice(0, -1));
  };

  const getCurrentFolderContents = () => {
    let folderContents = fsTree;
    for (const folder of currentPath) {
      folderContents =
        folderContents.find((item) => item.id === folder.id)?.children || [];
    }
    return folderContents;
  };

  const currentFolderContents = getCurrentFolderContents();

  useEffect(() => {
    if (!fsTree.length) return;

    const verifyAllFiles = async () => {
      console.log("🔍 Verifying all files...");
      const allFiles = [];

      const traverseTree = (nodes) => {
        nodes.forEach((node) => {
          if (!node.isFolder) {
            allFiles.push(node);
          }
          if (node.children) {
            traverseTree(node.children);
          }
        });
      };

      traverseTree(fsTree);

      for (const file of allFiles) {
        await verifyFileIntegrity(file);
      }
    };

    verifyAllFiles();
  }, [fsTree]);

  async function verifyFileIntegrity(item) {
    if (!item.ipfsHash) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:8080/ipfs/${item.ipfsHash}`
      );
      const fileBlob = await response.blob();
      const computedHash = await calculateSHA256(fileBlob);

      setFileIntegrity((prev) => ({
        ...prev,
        [item.id]: computedHash === item.sha256Hash ? "true" : "false",
      }));
    } catch (error) {
      console.error("Error verifying file integrity:", error);
      setFileIntegrity((prev) => ({ ...prev, [item.id]: "⚠️ Error" }));
    }
  }

  //file uploading

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
        description: "this is the test description",
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
          description: "this is the test description",
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
    const dialogue = document.querySelector(".file-upload-dialogue");
    dialogue.classList.add("loading");
    await processFile(file, "");
    event.target.value = "";
    dialogue.classList.remove("loading");
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

  function trimString(str) {
    return str.length > 10 ? str.slice(0, 10) + "..." : str;
  }

  return (
    <>
      <nav>
        <p>{caseId}</p>
      </nav>
      {(user?.authority == "top" || user?.authority == "mid") && (
        <>
          <div className="top-nav">
            <div className="search-file">
              {" "}
              <i class="bx bx-search"></i>{" "}
              <input type="text" placeholder="Go to file" />{" "}
            </div>
            <button onClick={() => setOpenFileDialougue((prev) => true)}>
              Add file
            </button>
          </div>
          {openFileDialougue && (
            <>
              <div
                className="bg-mask"
                onClick={() => setOpenFileDialougue((prev) => false)}
              ></div>
              <div className="file-upload-dialogue">
                choose the file to upload
                <input type="file" onChange={handleSingleFileUpload} />
              </div>
            </>
          )}
        </>
      )}
      <div className="file-system">
        <div className="folder-header">
          <h2 className="title">{caseId}</h2>
          <p className="last-modified">{lastModified}</p>
        </div>

        {currentPath.length > 0 && (
          <button className="back-button" onClick={goBack}>
            ⬅ Back
          </button>
        )}

        <div className="file-container">
          {currentFolderContents.map((item) => (
            <div
              key={item.id}
              className={`file-item ${item.isFolder ? "folder" : "file"}`}
              onClick={() =>
                item.isFolder
                  ? navigateTo(item)
                  : window.open(
                      `http://127.0.0.1:8080/ipfs/${item.ipfsHash}`,
                      "_blank"
                    )
              }
            >
              {item.isFolder ? "📁" : "📄"} {trimString(item.name)}
              <div className="basic-file-details">
                <p className="file-timestamp">{item.timestamp}</p>
                {!item.isFolder
                  ? fileintegrity[item.id]
                    ? "   🟢"
                    : "   🔴"
                  : " "}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default FileSystem;
