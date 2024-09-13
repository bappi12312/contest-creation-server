import { uploadOncloudinary } from "../utils/cloudinary.js"
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import { Contest } from "../models/contests.model.js";
import { User } from "../models/user.model.js";

const approveContest = asyncHandler(async (req,res) => {
  try {
    let contest = await Contest.findById(req.params.id)
    if(!contest) {
      return res.status(404).json({message: 'Contest not found'})
    }

    contest.status = 'approved'
    await contest.save()

    return res.status(200).json(
      new ApiResponse(201,contest,'contest approved successfully')
    )
  } catch (error) {
    console.error(error.message);
    res.status(500).send('contest creation problem');
  }
})

// reject a contest
const rejectContest = asyncHandler(async (req,res) => {
  try {
    let contest = await Contest.findById(req.params.id)
    if(!contest) {
      return res.status(404).json({message: 'No contest found'})
    }

    contest.status = 'rejected'

    await contest.save()

    return res.status(200).json(
      new ApiResponse(201,contest,'contest reject successfully')
    )
  } catch (error) {
    console.log(error,'error rejecting request')
    
    return res.status(500).send('server error while rejecting contest')
    
  }
})

