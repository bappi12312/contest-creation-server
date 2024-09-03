import mongoose from "mongoose";

const SubmissionSchema = new mongoose.Schema({
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true,
  },
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  submissionLink: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected',],
    default: 'pending'
  }
}, { timestamps: true });

export const Submission = mongoose.model('Submission',SubmissionSchema)