import { Contest } from "../models/contests.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createcheckoutSession = asyncHandler(async (req,res) => {
  try {
    const {contestId} = req.body;
    const contest = await Contest.findById(contestId)

    if(!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: contest.name,
            },
            unit_amount: 5000, // Amount in cents (e.g., $50)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        contestId: contestId, // Attach contest ID to session
      },
    });


    return res.status(200).json({id: session.id})

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
})
