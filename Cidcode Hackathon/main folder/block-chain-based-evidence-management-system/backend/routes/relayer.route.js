import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { uploadSingle } from "../controllers/relayer.controller.js";

export const relayerRouter = Router();

relayerRouter.route("/upload").post(upload.single("file"), uploadSingle);
