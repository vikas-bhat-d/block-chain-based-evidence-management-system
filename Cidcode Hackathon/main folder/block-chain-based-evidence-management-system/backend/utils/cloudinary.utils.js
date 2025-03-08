import { v2 as cloudinary } from "cloudinary";

import { configDotenv } from "dotenv";

configDotenv({
  path: "./.env",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const cloudinaryUpload = async function (localFilePath) {
  console.log(
    localFilePath,
    process.env.CLOUDINARY_NAME,
    process.env.CLOUDINARY_KEY,
    process.env.CLOUDINARY_SECRET
  );
  try {
    const cloudinary_response = await cloudinary.uploader.upload(
      localFilePath,
      { resource_type: "auto" }
    );
    return cloudinary_response;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

export const cloudinaryRemove = async function (public_id) {
  const cloudinary_response = await cloudinary.uploader.destroy(public_id);
  console.log("res:", cloudinary_response);
};

export default cloudinaryUpload;
