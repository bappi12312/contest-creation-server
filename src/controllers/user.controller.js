import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
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

  return res.status(401).json(
    new ApiError(200,"User registered successfully")
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

const logoutUser = asyncHandler(async (req,res) => {
  await User.findByIdAndUpdate(req.user._id,
    {
      $unset: {
        refreshToken: 1
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
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(
      new ApiResponse(
          200, {}, "User logout successfully"
      )
  )
})


const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request")
  }

  try {
      const decodedToken = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
      )

      const user = await User.findById(decodedToken?._id)

      if (!user) {
          throw new ApiError(401, "Invalid refresh token")
      }

      if (incomingRefreshToken !== user?.refreshToken) {
          throw new ApiError(401, "Refresh token expired or used")
      }

      const options = {
          httpOnly: true,
          secure: true
      }
      const { accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(user._id)
      return res
          .status(200)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", newrefreshToken, options)
          .json(
              new ApiResponse(
                  200,
                  { accessToken, refreshToken: newrefreshToken },
                  "Access token refreshed successfully"
              )
          )
  } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
  if (!isPasswordCorrect) {
      throw new ApiError(400, "invalid password")
  }
  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
      .status(200)
      .json(200, req.user, "Current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { name, email } = req.body
  if (!name && !email) {
      throw new ApiError(400, "All fields are required")
  }

  const user = User.findByIdAndUpdate(
      req.user?._id,
      {
          $set: {
              name,
              email
          }
      },
      { new: true }
  ).select("-password")

  return res
      .status(200)
      .json(new ApiResponse(200, user, "Account details updated successfully!!"))
})

const updateUserProfilePicture = asyncHandler(async (req, res) => {
  const profilePictureLocalPath = req.file?.path
  if (!profilePictureLocalPath) {
      throw new ApiError(400, "Avatar file is missing")
  }
  const profilePicture = await uploadOncloudinary(avatarLocalPath)
  if (!profilePicture.url) {
      throw new ApiError(400, "Error while uploading avatar file")
  }

  const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
          $set: {
              avatar: avatar.url
          }
      },
      { new: true }
  ).select("-password")

  return res
      .status(200)
      .json(new ApiResponse(200, user, "Avatar updated successfully"))

})

const getUserPercentage = asyncHandler(async (req,res) => {
  try {
    const user = await User.findById(req.user._id).populate('contestsParticipated')

    if(!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalContests = user.contestsParticipated.length;
    const wins = user.wins || 0;
    const winPercentage = totalContests > 0 ? (wins / totalContests) * 100 : 0;

    res.status(200).json({ winPercentage, totalContests, wins , message: 'getting results of user percentage'});
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error while getting user percentage');
  }
})

export {
  register,
  loginUser,
  logoutUser,
  updateAccountDetails,
  updateUserProfilePicture,
  getCurrentUser,
  updatePassword,
  refreshAccessToken,
  getUserPercentage,
}
