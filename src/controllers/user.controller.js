import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import { uploadOncloudinary } from "../utils/cloudinary.js"
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token")
  }
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (
    [name, email, password].some((value) => value?.trim() === "")
  ) {
    throw new ApiError(400, "all fields must be required")
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { name }]
  })

  if (existedUser) {
    throw new ApiError(409, 'user already exists')
  }

  const profilePictureLocalPath = req.files?.profilePicture[0]?.path;

  if (!profilePictureLocalPath) {
    throw new ApiError(400, "profile picture is required")
  }

  const profilePicture = await uploadOncloudinary(profilePictureLocalPath)

  if (!profilePicture) {
    throw new ApiError(400, "profile picture is not available")
  }

  const user = await User.create({
    name,
    profilePicture: profilePicture.url || '',
    email: email.toLowerCase(),
    password
  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
  )
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email) {
    throw new ApiError(400, "username  required")
  }

  const user = await User.findOne({
    $or: [{ email },]
  })

  if (!user) {
    throw new ApiError(404, "User does not exists")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new ApiError(401, "invalid user credentials")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

  const loggedUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        // data
        {
          user: loggedUser, accessToken, refreshToken
        },
        "User logged in successfully"
      )
    )
})