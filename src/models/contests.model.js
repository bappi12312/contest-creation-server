import mongoose from "mongoose";

const ContestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
    min: 10,
  },
  image: {
    type: String, //cloudinary url
    required: true,
    default: '',

  },
  type: {
    type: String,
    enum: ['Image Design', 'Article Writing', 'Marketing Strategy', 'Digital Advertisement', 'Gaming Review', 'Book Review', 'Business Idea', 'Movie Review'],
    required: true,
  },
  prize: {
    type: String,
    required: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  participants: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      submission: {
        type: String,
      },
    },
  ],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'confirmed', 'completed','winner_declared'],
    default: 'pending',
  },
  deadline: {
    type: Date,
    required: true,
  }

}, { timestamps: true });

export const Contest= mongoose.model("Contest",ContestSchema)