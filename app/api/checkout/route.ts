import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, birthDate, birthTime, birthLocation, birthLat, birthLng, email } = body;

    if (!name || !birthDate || !birthTime || !birthLocation || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Texture — Personalized Birth Chart Reading',
            description: '14 placements interpreted in full context. Delivered as a permanent URL.',
          },
          unit_amount: 3000, // $30.00
        },
        quantity: 1,
      }],
      metadata: {
        name,
        birth_date: birthDate,
        birth_time: birthTime,
        birth_location: birthLocation,
        birth_lat: birthLat?.toString() ?? '',
        birth_lng: birthLng?.toString() ?? '',
        email,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/#order`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
