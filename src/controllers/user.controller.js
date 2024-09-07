import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import { uploadOncloudinary} from "../utils/cloudinary.js"
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {ApiResponse} from "../utils/ApiResponse.js"


const register = asyncHandler(async (req,res) => {
  const {name,email,password} = req.body;

  if(
    [name,email,password].some((value) => value?.trim() === "")
  ) {
    throw new ApiError(400,"all fields must be required")
  }

  const existedUser = await User.findOne({
    $or: [{email},{name}]
  })

  if(existedUser) {
    throw new ApiError(409,'user already exists')
  }

 const profilePictureLocalPath = req.files?.profilePicture[0]?.path;

 if(!profilePictureLocalPath) {
  throw new ApiError(400, "profile picture is required")
 }

 const profilePicture = await uploadOncloudinary(profilePictureLocalPath)

 if(!profilePicture) {
  throw new ApiError(400, "profile picture is not available")
 }

 const user = await User.create({
  name,
  profilePicture: profilePicture.url || '',
  email: email.toLowerCase(),
  password
 })

 const createdUser = await User.findById(user._id).select("-password -refreshToken")
 
 if(!createdUser) {
  throw new ApiError(500, "Something went wrong while registering the user")
 }

 return res.status(201).json(
  new ApiResponse(200, createdUser, "User registered successfully")
)
})