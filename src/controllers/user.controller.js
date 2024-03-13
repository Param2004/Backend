import { asyncHandler } from "../utils/asyncHandler.js";
import { APIerror } from "../utils/APIerror.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import { APIresponse } from "../utils/APIresponse.js";


const registerUser = asyncHandler( async (req, res) => {
    //  get users details from frontend
    //  validation - not empty
    //  check if user already exist: username or email
    //  check for images, check for avatar
    //  upload them to cloudinary, avatar also check if multer has uploaded the file or not
    //  create user object - create entry in db
    //  remove password and refresh token field from response
    //  check for user creation
    //  return res

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if(Array.isArray(req.files.coverImage)&& req.files.coverImage.length > 0){
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    const {fullname, email, username, password} = req.body;
    //check all at once if any one is true
    if(
        [fullname, email, username, password].some(thisArg => !thisArg ||
        thisArg?.trim() === "")
    ){
        if (fs.existsSync(avatarLocalPath)) {
            fs.unlinkSync(avatarLocalPath); 
        }
        if (fs.existsSync(coverImageLocalPath)) {
            fs.unlinkSync(coverImageLocalPath); 
        }
        throw new APIerror(400, "fieldName is required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        if (fs.existsSync(avatarLocalPath)) {
            fs.unlinkSync(avatarLocalPath); 
        }
        if (fs.existsSync(coverImageLocalPath)) {
            fs.unlinkSync(coverImageLocalPath); 
        }
        throw new APIerror(409, "User with email or username already exist")
    }

    if(!avatarLocalPath){
        throw new APIerror(400, "Avatar file is required")
    }


    let avatar;
    let coverImage;
    if(avatarLocalPath){
        avatar = await uploadOnCloudinary(avatarLocalPath);
    }
    if(coverImageLocalPath){
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if(!avatar){
        throw new APIerror(400, "Avatar file is not uploaded on cloud")
    }


    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new APIerror(500, "Something went wrong while registring the user")
    }

    return res.status(201).json(
        new APIresponse(200, createdUser, "User Registered Successfully!")
    )

    // if(fullname ===""){
    //     throw new APIerror(400, "fullname is required")
    // }
    
    // testing
    // res.status(200).json({
    //     message: "data successfully sent"
    // })
})


export { registerUser }