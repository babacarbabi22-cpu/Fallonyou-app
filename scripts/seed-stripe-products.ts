import { getUncachableStripeClient } from '../server/stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating FallonYou Premium subscription product...');

  const existingProducts = await stripe.products.search({ 
    query: "name:'FallonYou Premium'" 
  });

  if (existingProducts.data.length > 0) {
    console.log('FallonYou Premium product already exists');
    console.log('Product ID:', existingProducts.data[0].id);
    
    const prices = await stripe.prices.list({ 
      product: existingProducts.data[0].id,
      active: true 
    });
    console.log('Existing prices:', prices.data.map(p => ({ id: p.id, amount: p.unit_amount })));
    return;
  }

  const product = await stripe.products.create({
    name: 'FallonYou Premium',
    description: 'Unlock unlimited likes and see who liked your profile. Find your perfect match faster!',
    metadata: {
      app: 'fallonyou',
      type: 'subscription',
      benefits: 'unlimited_likes,see_who_liked_you',
    },
  });

  console.log('Created product:', product.id);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 700,
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: {
      plan: 'monthly',
    },
  });

  console.log('Created monthly price:', monthlyPrice.id, '- €7.00/month');

  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 5900,
    currency: 'eur',
    recurring: { interval: 'year' },
    metadata: {
      plan: 'yearly',
      savings: '25%',
    },
  });

  console.log('Created yearly price:', yearlyPrice.id, '- €59.00/year (saves 25%)');

  console.log('\n✅ Products created successfully!');
  console.log('Product ID:', product.id);
  console.log('Monthly Price ID:', monthlyPrice.id);
  console.log('Yearly Price ID:', yearlyPrice.id);
}

createProducts().catch(console.error);
