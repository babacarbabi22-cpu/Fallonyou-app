import { getUncachableStripeClient } from '../server/stripeClient';
import { updatePremiumCatalogue } from './premium-catalogue';

async function createProducts() {
  if (process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Do not run catalogue maintenance in production");
  }
  const stripe = await getUncachableStripeClient();
  console.log("Updated test-mode Premium catalogue:", await updatePremiumCatalogue(stripe));
}

createProducts().catch(() => {
  console.error("Premium catalogue update failed; check connection, product and test-mode access.");
  process.exitCode = 1;
});
