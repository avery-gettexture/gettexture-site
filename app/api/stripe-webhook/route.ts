import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { randomInt } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () => chars[randomInt(chars.length)]).join('');
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata!;

  try {
    // Generate unique slug
    let slug = generateSlug();
    let slugExists = true;
    while (slugExists) {
      const { data } = await supabase.from('readings').select('slug').eq('slug', slug).single();
      if (!data) slugExists = false;
      else slug = generateSlug();
    }

    // Parse birth date and time
    const [year, month, day] = meta.birth_date.split('-').map(Number);
    const timeStr = meta.birth_time;
    const [timePart, ampm] = timeStr.split(' ');
    const [rawHour, minute] = timePart.split(':').map(Number);
    let hour = rawHour;
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const lat = parseFloat(meta.birth_lat);
    const lng = parseFloat(meta.birth_lng);

    // Calculate chart — same as admin form
    const chartRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: { year, month, day, hour, minute, latitude: lat, longitude: lng }
      }),
    });
    const chartJson = chartRes.ok ? await chartRes.json() : null;
    const chartData = chartJson?.chart_data ?? chartJson;

    // Create reading in Supabase (email no longer lives here — Stage Three)
    const { data: newReading, error: insertError } = await supabase
      .from('readings')
      .insert({
        slug,
        name: meta.name,
        birth_date: meta.birth_date,
        birth_time: meta.birth_time,
        birth_location: meta.birth_location,
        birth_lat: parseFloat(meta.birth_lat),
        birth_lng: parseFloat(meta.birth_lng),
        birth_time_known: true,
        chart_data: chartData,
        stripe_session_id: session.id,
      })
      .select('id')
      .single();

    if (insertError) throw new Error(`Supabase insert error: ${insertError.message}`);

    // Email lives in reading_contacts now, keyed by the reading's internal
    // id (never the slug) — this must run after the insert above, since
    // the id doesn't exist until the reading is created. full_name is left
    // empty; a future billing/identity capture flow would populate it here.
    const { error: contactError } = await supabase.from('reading_contacts').insert({
      reading_id: newReading.id,
      email: meta.email,
    });

    if (contactError) throw new Error(`Supabase reading_contacts insert error: ${contactError.message}`);

    const readingUrl = `https://gettexture.app/reading/${slug}`;

    // Trigger content generation in background (don't await — let it run async)
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(err => console.error('Generation trigger error:', err));

    // Send confirmation email
    await resend.emails.send({
      from: 'Texture <hello@gettexture.app>',
      to: meta.email,
      subject: 'Your Texture reading',
      html: `
        <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 48px 32px; background: #FDF5ED; color: #161612;">
          <div style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: rgba(185,18,18,0.75); letter-spacing: 3px; margin-bottom: 40px;">TEXTURE</div>
          <p style="font-size: 18px; line-height: 1.6; margin-bottom: 24px;">Hi ${meta.name},</p>
          <p style="font-size: 16px; line-height: 1.75; color: rgba(22,22,18,0.80); margin-bottom: 32px;">
            Your birth chart reading is being prepared. Content generation takes a few moments — your reading will be ready shortly at the link below.
          </p>
          <a href="${readingUrl}" style="display: inline-block; background: rgba(185,18,18,0.75); color: #FDF5ED; text-decoration: none; padding: 14px 28px; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 2px; margin-bottom: 32px;">
            VIEW YOUR READING →
          </a>
          <p style="font-size: 13px; color: rgba(22,22,18,0.45); line-height: 1.7; margin-bottom: 8px;">
            Save this link — it's permanent and belongs to you. You can return to it anytime.
          </p>
          <p style="font-size: 12px; color: rgba(22,22,18,0.30); margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(22,22,18,0.10);">
            ${readingUrl}<br/>
            Questions? Contact us at help@gettexture.app
          </p>
        </div>
      `,
    });

    return NextResponse.json({ received: true, slug });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
