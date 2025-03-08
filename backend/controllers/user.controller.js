import asyncHandler from "../utils/asyncHandler.utils.js";
import apiError from "../utils/apiError.utils.js";
import apiResponse from "../utils/apiResponse.utils.js";
import { User } from "../models/user.model.js";
import cloudinaryUpload, {
  cloudinaryRemove,
} from "../utils/cloudinary.utils.js";
import fs from "fs";
import mongoose from "mongoose";
import { ethers } from "ethers";
import EvidenceStorageJson from "../EvidenceStorage.json" assert { type: "json" };

// console.log(EvidenceStorageJson.abi);
const abi = EvidenceStorageJson.abi;
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
};

const provider = new ethers.JsonRpcProvider(process.env.JSON_RPC_URL);
const privateKey = process.env.RELAYER_PRIVATE_KEY;

const wallet = new ethers.Wallet(privateKey, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;

const contract = new ethers.Contract(contractAddress, abi, wallet);

const generateTokens = async function (userId) {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();

    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(400, error?.message || "tokens couldn't be generated");
  }
};

const registerUser = asyncHandler(async (req, res, next) => {
  const { username, email, password, wallet_address, authority } = req.body;
  const displayPicture = req?.file ? req.file.path : "";
  let cloudinaryResponse = null;
  let savedUser = null;

  if (
    [username, email, password, displayPicture].some(
      (field) => field?.trim() === ""
    )
  ) {
    return res
      .status(400)
      .send(new apiResponse(400, null, "all fields are required"));
  }

  let existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    fs.unlinkSync(displayPicture);
    throw new apiError(400, "user alreary exists");
  }

  try {
    if (req.file) {
      cloudinaryResponse = await cloudinaryUpload(displayPicture);
      console.log(cloudinaryResponse);
    }
  } catch (error) {
    throw new apiError(400, "Cloudinary Upload Error: ", error);
  }

  const newUser = new User({
    username,
    password,
    email,
    wallet_address,
    authority,
    profilePicture: cloudinaryResponse?.secure_url,
    profilePictureId: cloudinaryResponse?.public_id,
  });

  try {
    savedUser = await newUser.save();
    console.log(savedUser);
  } catch (error) {
    console.log(error);
    throw new apiError(500, "couldn't register user");
  }

  if (req.file) fs.unlinkSync(req?.file?.path);

  const registeredUser = await User.findOne({ _id: savedUser._id }).select(
    "-password -createdAt -updatedAt"
  );
  console.log(registeredUser);

  res.status(200).send(new apiResponse(200, registeredUser));
});

const fetchuser = asyncHandler(async (req, res, next) => {
  const user = req.query.username;
  let fetchedUser = await User.findOne({ username: user });
  res.send(new apiResponse(200, fetchedUser, "fetched user succesfully"));
});

const fetchuserID = asyncHandler(async (req, res, next) => {
  console.log(req.query.userId);
  const userID = new mongoose.Types.ObjectId(req.query.userId);
  let fetchedUser = await User.findOne({ _id: userID });
  res.send(new apiResponse(200, fetchedUser, "fetched user succesfully"));
});

const loginUser = asyncHandler(async (req, res, next) => {
  let { username, password, signature } = req.body;

  if (username.trim() == "" || password.trim() == "")
    throw new apiError(400, "All fields are required");

  let existedUser = await User.findOne({ username: username });
  if (!existedUser) throw new apiError(400, "Incorrect username");

  let isPasswordCorrect = await existedUser.checkPassword(password);

  if (!isPasswordCorrect) throw new apiError(400, "Incorrect password");

  const messageHash = await contract.getLoginHash(
    username,
    password,
    existedUser.wallet_address
  );

  console.log("message hash: ", messageHash);
  const recoveredSigner = await contract.recoverSigner(messageHash, signature);

  console.log("recovered signer: ", recoveredSigner);

  if (
    recoveredSigner.toLowerCase() !== existedUser.wallet_address.toLowerCase()
  ) {
    return res.status(400).json({ success: false, error: "Invalid signature" });
  }

  let { accessToken, refreshToken } = await generateTokens(existedUser._id);

  let loggedInUser = await User.find({ _id: existedUser._id }).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    })
    .json(
      new apiResponse(
        200,
        { User: loggedInUser, accessToken, refreshToken },
        "logged user succesfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res, next) => {
  await User.findOneAndUpdate(
    { _id: req.user._id },
    {
      $set: {
        refreshToken: undefined,
      },
    }
  );

  return res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .status(200)
    .json(new apiResponse(200, {}, "User logged out succesfully"));
});

const editProfile = asyncHandler(async (req, res, next) => {
  // console.log("req recieved");
  const response = await cloudinaryRemove(req.body.public_id);
  console.log("test");
  res.send(response);
});

const requestCollaboration = asyncHandler(async (req, res, next) => {
  const { caseId, role } = req.body;
});

const addCollaborator = asyncHandler(async (req, res, next) => {
  //get the userId,caseId and role verify the authority level, update the smart contract by calling the function assignRole (caseId,userAddress,uploader,role(enum))..

  const { username, caseId, role, signature } = req.body;
  const uploader = req.user.wallet_address;

  const user = await User.findOne({ username: username });
  if (!user) throw new apiError(400, "username not found");

  const dataHash = await contract.getRoleHash(
    caseId,
    user.wallet_address,
    uploader,
    role
  );

  const recoveredSigner = await contract.recoverSigner(dataHash, signature);
  if (!recoveredSigner == uploader)
    throw new apiError(400, "Invalid signature");

  const gasLimit = await contract.assignRole.estimateGas(
    caseId,
    user.wallet_address,
    uploader,
    role
  );

  console.log("gas limit: ", gasLimit);

  const gasPrice = (await provider.getFeeData()).gasPrice;
  console.log(gasPrice);

  const tx = await contract.assignRole(
    caseId,
    user.wallet_address,
    uploader,
    role,
    {
      gasLimit,
      gasPrice,
    }
  );

  await tx.wait();
  console.log("transaction successfull: ", tx.hash);

  res
    .status(200)
    .send(new apiResponse(200, { txHash: tx.hash }, "transaction successfull"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  fetchuser,
  fetchuserID,
  editProfile,
  addCollaborator,
};

//auth-> role based ->role should be fetched either from the blockchain or database
//file uploading is done through client
//searching and adding the the collaborators...
//
