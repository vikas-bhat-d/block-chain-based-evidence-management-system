import asyncHandler from "../utils/asyncHandler.utils.js";
import apiError from "../utils/apiError.utils.js";
import apiResponse from "../utils/apiResponse.utils.js";
import { ethers } from "ethers";
import EvidenceStorageJson from "../EvidenceStorage.json" assert { type: "json" };
import { create } from "ipfs-http-client";

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ABI = EvidenceStorageJson.abi;
const provider = new ethers.JsonRpcProvider(process.env.JSON_RPC_URL);
const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

const ipfs = create({ host: "localhost", port: "5002", protocol: "http" });

export const uploadSingle = asyncHandler(async (req, res, next) => {
  const { caseId, parentId, uploader } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file uploaded" });

  const { path: ipfsHash } = await ipfs.add(file.buffer);
  const sha256Hash = ethers.keccak256(file.buffer);
  const fileId = `F${Date.now()}${Math.random()}`;

  // Generate Signature
  const messageHash = ethers.keccak256(
    ethers.toUtf8Bytes(`${caseId}${fileId}${ipfsHash}${sha256Hash}`)
  );

  // Call Smart Contract
  const tx = await contract.storeEvidence(
    {
      caseId,
      id: fileId,
      name: file.originalname,
      ipfsHash,
      sha256Hash,
      mimeType: file.mimetype,
      uploader,
      isFolder: false,
      parentId,
    },
    signature
  );
  await tx.wait();

  res.json({ message: "File uploaded and stored successfully!", ipfsHash });
});
