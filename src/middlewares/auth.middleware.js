import jwt from 'jsonwebtoken'
import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const verifyJwt = asyncHandler(async (req, _, next) => {
  try {
    const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      throw new ApiError(401, "unauthorized access")
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id).select("_password -refreshToken")

    if (!user) {
      throw new ApiError(401, "unauthorized access")

    }

    req.user = user;
    next()
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token")
  }
})

const admin = (req,res,next) => {
  if(req.user && req.user.role === 'admin') {
    next()
  } else {
    res.status(401).json({message: 'not authorized asa an admin'})
  }
}

const creator = (req,res,next) => {
  if(req.user && req.user.role === 'creator') {
    next()
  } else {
    res.status(401).json({message: 'not authorized asa an creator'})
  }
}

export {admin,creator}
