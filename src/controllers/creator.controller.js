import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import { uploadOncloudinary } from "../utils/cloudinary.js"
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import { Contest } from "../models/contests.model.js";

const createContest = asyncHandler(async (req,res) => {
  const {name,description,type,prize,deadline}=req.body;
  try {
    if([name,description,type,prize,deadline].some((field) => field.trim() === '')) {
      throw new ApiError(400, "all fields must be required")
    }
  
    const imageLocalPath = req.files?.image[0]?.path;
    if (!imageLocalPath) {
      throw new ApiError(400, "imagepath is required")
    }
    const image = await uploadOncloudinary(imageLocalPath)
    if(!image) {
      throw new ApiError(401, "image is required")
    }
  
    const contest = new Contest({
      name,
      description,
      deadline,
      image: image?.url || '',
      type,
      prize,
      creator: req.user._id,
    }) 
  
    await contest.save()
  
    return res.status(201).json(
      new ApiResponse(200, contest, "contest create successfully")
    )
  } catch (error) {
    console.log(error,"contest create failed");
    
  }
})

const getAllContests = asyncHandler(async (req,res) => {
  try {
    const contests = await Contest.find({}).populate('creator','name')

    return res.status(200).json(
      new ApiResponse(200,contests,'get all contestes')
    )
  } catch (error) {
    console.log(error);

    res.status(500).send('server error',error);
    
  }
})

// get single contest 
const getSingleContest = asyncHandler(async (req,res) => {
try {
  const contest = await Contest.findById(req.params.id).populate('creator','name')
  
  if(!contest) {
    return new ApiError(404,"no contest found")
  }
  
  return res.status(200).json(
    new ApiResponse(201,contest,'contest sending successfully')
  )
} catch (error) {
  console.log(error,'error while sending getsingleContests');
  return res.status(500).send('error while sending getsingleContests')
  
}
})
