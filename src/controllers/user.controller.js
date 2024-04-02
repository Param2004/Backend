import { asyncHandler } from "../utils/asyncHandler.js";
import { APIerror } from "../utils/APIerror.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import { APIresponse } from "../utils/APIresponse.js";


const generateAccessAndRefreshToken = async (userId){
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};


    } catch (error) {
        throw new APIerror(500, "Something went wrong while generating refresh and access token");
    }
}


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

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    //username or email
    //find the user
    //password check
    //acces and refresh token
    // send cookie

    const {email, username, password} = req.body

    if(!username || !email){
        throw new APIerror(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    });

    if(!user){
        throw new APIerror(404, "user does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new APIerror(401, "Incorrect Password");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new APIresponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
});

const logoutUser = asyncHandler(async(req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new APIresponse(200, {}, "User logged out successfully"));
});

export { 
    registerUser,
    loginUser,
    logoutUser
 }