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
  const { username, email, password, wallet_address } = req.body;
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
  const provider = new ethers.JsonRpcProvider(process.env.JSON_RPC_URL);
  const privateKey = process.env.RELAYER_PRIVATE_KEY;

  const wallet = new ethers.Wallet(privateKey, provider);
  const contractAddress = process.env.CONTRACT_ADDRESS;

  const contract = new ethers.Contract(contractAddress, abi, wallet);

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

export {
  registerUser,
  loginUser,
  logoutUser,
  fetchuser,
  fetchuserID,
  editProfile,
};
