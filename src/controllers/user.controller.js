import { asyncHandler } from "../utils/asyncHandler.js";
import { APIerror } from "../utils/APIerror.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
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

    const {fullname, email, username, password} = req.body

    //check all at once if any one is true
    if(
        [fullname, email, username, password].some((field) =>
        field?.trim() === "")
    ){
        throw new APIerror(400, "fullname is required")
    }

    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new APIerror(409, "User with email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new APIerror(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar){
        throw new APIerror(400, "Avatar file is required")
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