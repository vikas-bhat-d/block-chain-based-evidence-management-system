import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { loginUser, logoutUser, registerUser,editProfile } from "../controllers/user.controller.js";
import asyncHandler from "../utils/asyncHandler.utils.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter=Router();

userRouter.route("/register").post(upload.single("displayPicture"),registerUser);
userRouter.route("/").get(verifyJWT, asyncHandler(
        async (req,res,next) => {
            res.send(req.user);
        }
))

userRouter.route("/login").post(upload.single("displayPicture"),loginUser);
userRouter.route("/logout").delete(verifyJWT,logoutUser);
userRouter.route("/editProfile").patch(verifyJWT,editProfile)

export {userRouter}