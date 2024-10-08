import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import { uploadOncloudinary } from "../utils/cloudinary.js"
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import { Contest } from "../models/contests.model.js";

const createContest = asyncHandler(async (req, res) => {
  const { name, description, type, prize, deadline } = req.body;
  try {
    if ([name, description, type, prize, deadline].some((field) => field.trim() === '')) {
      throw new ApiError(400, "all fields must be required")
    }

    const imageLocalPath = req.files?.image[0]?.path;
    if (!imageLocalPath) {
      throw new ApiError(400, "imagepath is required")
    }
    const image = await uploadOncloudinary(imageLocalPath)
    if (!image) {
      throw new ApiError(401, "image is required")
    }

    const contest = new Contest({
      name,
      description,
      deadline,
      image: image?.url || '',
      type,
      prize,
      participants: [],
      status: 'pending',
      creator: req.user._id,
    })

    await contest.save()

    return res.status(201).json(
      new ApiResponse(200, contest, "contest create successfully")
    )
  } catch (error) {
    console.log(error, "contest create failed");

  }
})

const getAllContests = asyncHandler(async (req, res) => {
  try {

    const {page = 1, limit = 10, search} = req.query

    const query = search ? {$text: {$search: search}} : {}

    const contests = await Contest.find({}).populate('winner')
    .limit(limit * 1)
    .skip(page - 1)
    .exec()

    const count = await Contest.countDocuments(query)


   return res.status(200).json({
      contests,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send('server error while getting all contest', error);

  }
})

// get single contest 
const getSingleContest = asyncHandler(async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id).populate('creator', 'name')

    if (!contest) {
      return new ApiError(404, "no contest found")
    }

    return res.status(200).json(
      new ApiResponse(201, contest, 'contest sending successfully')
    )
  } catch (error) {
    console.log(error, 'error while sending getsingleContests');
    return res.status(500).send('error while sending getsingleContests')

  }
})

// update a contest
const updateContest = asyncHandler(async (req, res) => {
  try {
    let contest = await Contest.findById(req.params.id);
    if (!contest) {
      throw new ApiError(404, 'not contest found')
    }

    if (contest.creator.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'not authorized' })
    }

    contest = await Contest.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )

    return res.status(200).json(201, contest, 'contest updated successfully')
  } catch (error) {
    console.log(error, "error updating contest");
    return res.status(500).send('error updating contest')

  }
})

// delete the contest
const deleteContest = asyncHandler(async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);

    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    if (contest.creator.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await contest.remove()
  } catch (error) {
    console.log(error, 'Error removing contest')
    return res.status(401).send('Error removing contest')

  }
})

// register for a contest
const registerForContest = asyncHandler(async (req,res) => {
  try {
    const contest = await Contest.findById(req.params.id)

    if(!contest) {
      return res.status(404).json({message: 'contest not found'})
    }

    const isAlreadyRegistered = contest.participants.some(
      (participant) => participant.user.toString() = req.user.id
    )

    if(isAlreadyRegistered) {
      return res.status(400).json({ message: 'Already registered for this contest' });
    }

    contest.participants.push({user: req.user._id, submission: req.body.submission})

    await contest.save() //i don't know about but lets try


    const user = await User.findById(req.user._id)
    user.contestsParticipated.push(contest._id)
    await user.save()

   return res.status(200).json({ message: 'Successfully registered for the contest', contest });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error while registering for the contest');
  }
})

// declare a winner for a contest
const declareWinner = asyncHandler(async (req,res) => {
  try {
    const contest = await Contest.findById(req.params.id)

    if(!contest) {
      return res.status(404).json({message: 'No contest found'})
    }

    if(contest.status !== 'completed') {
      return res.status(400).json({ message: 'Contest is not yet completed' })
    }

    const winner = await User.findById(req.body.winnerId)
    if(!winner) {
      return res.status(404).json({ message: 'Winner not found' });
    }

    contest.winner = winner._id;
    contest.status = 'winner_declared'

    await winner.save()
    res.status(200).json({ message: 'Winner declared successfully', contest });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error while declaring winner');
  }
})
