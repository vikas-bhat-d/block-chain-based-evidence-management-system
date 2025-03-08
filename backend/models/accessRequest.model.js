import mongoose, { Schema } from "mongoose";

const requestSchema = new Schema({
  caseId: String,
  sender: String,
});

export const Request = mongoose.model("Request", requestSchema);
