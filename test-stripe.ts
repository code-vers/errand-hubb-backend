import 'dotenv/config';
import { config } from './src/config/config.js';
import Stripe from 'stripe';

const stripe = new Stripe(config.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2024-12-18.acacia' as any,
});

async function main() {
  try {
    const customer = await stripe.customers.create({ email: 'test@example.com' });
    console.log("Customer:", customer.id);
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: config.STRIPE_ADS_MONTHLY_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: config.STRIPE_ADS_SUCCESS_URL,
      cancel_url: config.STRIPE_ADS_CANCEL_URL,
    });
    console.log("Session created:", session.url);
  } catch (error: any) {
    console.error("Stripe Error:", error.message);
  }
}
main();
