import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    
    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      try {
        const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        await WebhookHandlers.handleStripeEvent(event);
      } catch (err) {
        console.log('Custom webhook handling skipped (using managed webhooks)');
      }
    }
  }

  static async handleStripeEvent(event: any): Promise<void> {
    const subscription = event.data?.object;
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await WebhookHandlers.handleSubscriptionUpdate(subscription);
        break;
      case 'customer.subscription.deleted':
        await WebhookHandlers.handleSubscriptionCanceled(subscription);
        break;
      case 'checkout.session.completed':
        await WebhookHandlers.handleCheckoutCompleted(event.data.object);
        break;
    }
  }

  static async handleSubscriptionUpdate(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    const status = subscription.status;
    
    const isPremium = ['active', 'trialing'].includes(status);
    const currentPeriodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000)
      : null;

    const result = await storage.updateUserByStripeCustomerId(customerId, {
      isPremium: isPremium ? 'true' : 'false',
      stripeSubscriptionId: subscription.id,
      premiumExpiresAt: currentPeriodEnd,
    });
    
    if (result) {
      console.log(`Updated premium status for customer ${customerId}: ${isPremium}`);
    }
  }

  static async handleSubscriptionCanceled(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    
    await storage.updateUserByStripeCustomerId(customerId, {
      isPremium: 'false',
      stripeSubscriptionId: null,
      premiumExpiresAt: null,
    });
    
    console.log(`Canceled subscription for customer ${customerId}`);
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    if (session.mode === 'subscription' && session.subscription) {
      const customerId = session.customer;
      
      await storage.updateUserByStripeCustomerId(customerId, {
        stripeSubscriptionId: session.subscription,
        isPremium: 'true',
      });
      
      console.log(`Checkout completed for customer ${customerId}, subscription ${session.subscription}`);
    }
  }
}
