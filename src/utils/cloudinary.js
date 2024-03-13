//reusable code anywhere
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error("Invalid file path");
        }
       
        // Upload file on Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        // Successfully uploaded
        // console.log("File is uploaded on Cloudinary", response.url);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // Remove the locally saved temp file as the upload operation passed
        }
        return response;
    } catch (error) {
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // Remove the locally saved temp file as the upload operation failed
        }

        console.error("Error uploading file to Cloudinary:", error);
        return null;
    }
};

export { uploadOnCloudinary };
