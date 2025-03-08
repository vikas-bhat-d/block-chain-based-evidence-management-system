import mongoose from "mongoose";
const connectDB=async()=>{
    try
    {
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}${process.env.DB_NAME}`);
        console.log("connected to MongoDB at: ",connectionInstance.connection.host,':',connectionInstance.connection.port);
    }
    catch(err){
        console.log("MongoDB connection error: ",err);
    }
}

export default connectDB;