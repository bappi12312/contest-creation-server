import { Contest } from "../models/contests.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const handleStripeWebhook = asyncHandler(async (req,res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const contestId = session.metadata.contestId;

      // Find the contest and update the status to 'completed'
      const contest = await Contest.findById(contestId);

      if (contest) {
        contest.status = 'completed';
        await contest.save();
        console.log(`Contest ${contestId} marked as completed.`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error in Stripe Webhook:', err.message);
    res.status(400).send(`Webhook error: ${err.message}`);
  }
})

 const verifyPayment = async (req, res) => {
  const sessionId = req.query.session_id;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ success: false });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
};

export {
  handleStripeWebhook,
  verifyPayment
}