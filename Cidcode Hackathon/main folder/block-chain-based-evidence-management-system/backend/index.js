import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "./db/dbConnection.js";
import cors from "cors";
import { configDotenv } from "dotenv";

configDotenv({
  path: "./.env",
});

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

console.log(process.env.CORS_ORIGIN);

app.use(express.json());
app.use(express.static("./public"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("listening");
});

import { userRouter } from "./routes/user.route.js";
import { relayerRouter } from "./routes/relayer.route.js";
app.use("/api/v1/user", userRouter);
app.use("/api/v1/relayer", relayerRouter);

app.get("/hello", (req, res) => {
  const user = req.query.user;
  res.send(`<!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        </head>
        <body>
        <p>Hello ${user} this is the test file</p>
        </body>
        </html>`);
});

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  console.log("error detected", err.message);
  return res.status(err.statusCode).send({ ...err, message: err.message });
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      console.log("Listening on port ", process.env.PORT || 5000)
    );
  })
  .catch((err) => {
    console.log("error occured");
  });
