import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Heart, Eye, Sparkles, Check, Gift, CreditCard, HelpCircle, Shield, Star } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { SiPaypal } from "react-icons/si";
import PayPalButton from "@/components/PayPalButton";

export default function PremiumPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  const verifySessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest('POST', '/api/premium/verify-session', { sessionId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/premium/status'] });
    }
  });

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (success && sessionId) {
      verifySessionMutation.mutate(sessionId);
      toast({
        title: "Welcome to Premium!",
        description: "Your subscription is now active. Enjoy unlimited likes!",
      });
      window.history.replaceState({}, '', '/premium');
    } else if (success) {
      toast({
        title: "Welcome to Premium!",
        description: "Your subscription is now active. Enjoy unlimited likes!",
      });
      window.history.replaceState({}, '', '/premium');
    }
    if (canceled) {
      toast({
        title: "Payment Canceled",
        description: "No worries! You can subscribe anytime.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/premium');
    }
  }, [success, canceled, toast]);

  interface PremiumStatus {
    isPremium: boolean;
    trialEndsAt?: string;
    premiumExpiresAt?: string;
  }

  interface ProductsData {
    products: Array<{
      price_id: string;
      unit_amount: number;
      product_name: string;
    }>;
  }

  interface LikedByData {
    count: number;
    users: Array<{
      id: string;
      firstName?: string;
      photos?: Array<{ url: string }>;
      profile?: any;
    }>;
    isPremium: boolean;
  }

  interface PaymentMethodsData {
    stripe: boolean;
    paypal: boolean;
  }

  const { data: premiumStatus, isLoading: statusLoading } = useQuery<PremiumStatus>({
    queryKey: ['/api/premium/status'],
  });

  const { data: productsData, isLoading: productsLoading } = useQuery<ProductsData>({
    queryKey: ['/api/premium/products'],
  });

  const { data: likedByData } = useQuery<LikedByData>({
    queryKey: ['/api/premium/liked-by'],
  });

  const { data: paymentMethods } = useQuery<PaymentMethodsData>({
    queryKey: ['/api/payment-methods'],
  });

  const [showPayPal, setShowPayPal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId, includeTrial }: { priceId: string; includeTrial?: boolean }) => {
      const res = await apiRequest('POST', '/api/premium/checkout', { priceId, includeTrial });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    }
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/premium/portal', {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const trialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/premium/trial', {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trial Started!",
        description: "Enjoy 7 days of premium features for free!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/premium/status'] });
    },
    onError: () => {
      toast({
        title: "Trial Not Available",
        description: "You've already used your free trial.",
        variant: "destructive",
      });
    }
  });

  if (statusLoading || productsLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  const isPremium = premiumStatus?.isPremium;
  const products = productsData?.products || [];

  const monthlyPrice = products.find((p: any) => p.recurring?.interval === 'month');
  const yearlyPrice = products.find((p: any) => p.recurring?.interval === 'year');

  const premiumBenefits = [
    { icon: Heart, title: "Unlimited Likes", description: "Like as many profiles as you want, no daily limits" },
    { icon: Eye, title: "See Who Liked You", description: "View everyone who's interested in you" },
    { icon: Sparkles, title: "Priority Visibility", description: "Get seen by more potential matches" },
    { icon: Star, title: "Advanced Filters", description: "Find exactly who you're looking for" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-pink-500/20" />
        <div className="relative px-6 py-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30 mb-6"
          >
            <Crown className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-premium-title">
            FallonYou Premium
          </h1>
          <p className="text-muted-foreground">
            Unlock the full dating experience
          </p>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {isPremium ? (
          <Card className="border-amber-500/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium Active
                </Badge>
              </div>
              <CardTitle className="text-xl">You're a Premium Member!</CardTitle>
              <CardDescription>
                {premiumStatus?.trialEndsAt ? (
                  <>Trial ends: {new Date(premiumStatus.trialEndsAt).toLocaleDateString()}</>
                ) : premiumStatus?.premiumExpiresAt ? (
                  <>Renews: {new Date(premiumStatus.premiumExpiresAt).toLocaleDateString()}</>
                ) : (
                  <>Enjoy all premium features</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {premiumBenefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-medium">{benefit.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-subscription"
              >
                {portalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                Manage Subscription
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            {!premiumStatus?.trialEndsAt && (
              <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5">
                <CardHeader className="text-center">
                  <Gift className="w-12 h-12 mx-auto text-primary mb-2" />
                  <CardTitle>Try Premium Free for 7 Days</CardTitle>
                  <CardDescription>
                    Experience all premium features before you decide
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-purple-600"
                    onClick={() => trialMutation.mutate()}
                    disabled={trialMutation.isPending}
                    data-testid="button-start-trial"
                  >
                    {trialMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />}
                    Start Free Trial
                  </Button>
                </CardFooter>
              </Card>
            )}

            <section>
              <h2 className="text-xl font-bold mb-4">Premium Benefits</h2>
              <div className="grid gap-4">
                {premiumBenefits.map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center">
                          <benefit.icon className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{benefit.title}</h3>
                          <p className="text-sm text-muted-foreground">{benefit.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Choose Your Plan</h2>
              <div className="grid gap-4">
                {monthlyPrice && (
                  <Card className="relative overflow-hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Monthly</span>
                        <span className="text-2xl font-bold">
                          €{(monthlyPrice.unit_amount / 100).toFixed(2)}
                          <span className="text-sm font-normal text-muted-foreground">/month</span>
                        </span>
                      </CardTitle>
                      <CardDescription>Billed monthly, cancel anytime</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button
                        className="w-full"
                        onClick={() => checkoutMutation.mutate({ priceId: monthlyPrice.price_id })}
                        disabled={checkoutMutation.isPending}
                        data-testid="button-subscribe-monthly"
                      >
                        {checkoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Subscribe Monthly
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                {yearlyPrice && (
                  <Card className="relative overflow-hidden border-amber-500">
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      SAVE 25%
                    </div>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Yearly</span>
                        <span className="text-2xl font-bold">
                          €{(yearlyPrice.unit_amount / 100).toFixed(2)}
                          <span className="text-sm font-normal text-muted-foreground">/year</span>
                        </span>
                      </CardTitle>
                      <CardDescription>Best value! Billed annually</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        onClick={() => checkoutMutation.mutate({ priceId: yearlyPrice.price_id })}
                        disabled={checkoutMutation.isPending}
                        data-testid="button-subscribe-yearly"
                      >
                        {checkoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                        Subscribe Yearly
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                {!monthlyPrice && !yearlyPrice && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        Subscription plans are being set up. Please check back soon!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold">Payment Methods</h2>
              <Card>
                <CardContent className="flex flex-wrap gap-3 p-4">
                  <Badge variant="secondary" className="gap-1">
                    <CreditCard className="w-3 h-3" /> Credit Card
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <CreditCard className="w-3 h-3" /> Debit Card
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    Apple Pay
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    Google Pay
                  </Badge>
                  {paymentMethods?.paypal && (
                    <Badge variant="secondary" className="gap-1">
                      <SiPaypal className="w-3 h-3" /> PayPal
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {paymentMethods?.paypal && (
                <Card className="border-blue-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SiPaypal className="w-5 h-5 text-blue-600" />
                      Pay with PayPal
                    </CardTitle>
                    <CardDescription>
                      Quick and secure payment with your PayPal account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant={selectedPlan === 'monthly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedPlan('monthly')}
                        data-testid="button-paypal-monthly"
                      >
                        Monthly (€7)
                      </Button>
                      <Button
                        variant={selectedPlan === 'yearly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedPlan('yearly')}
                        data-testid="button-paypal-yearly"
                      >
                        Yearly (€59)
                      </Button>
                    </div>
                    <PayPalButton
                      amount={selectedPlan === 'monthly' ? '7.00' : '59.00'}
                      currency="EUR"
                      intent="CAPTURE"
                      onSuccess={async () => {
                        await apiRequest('POST', '/api/premium/activate-paypal', { plan: selectedPlan });
                        queryClient.invalidateQueries({ queryKey: ['/api/premium/status'] });
                        toast({
                          title: "Welcome to Premium!",
                          description: "Your PayPal payment was successful. Enjoy unlimited likes!",
                        });
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </section>
          </>
        )}

        {likedByData && likedByData.count > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              {likedByData.count} people liked you
            </h2>
            {isPremium ? (
              <div className="grid grid-cols-3 gap-3">
                {likedByData.users?.map((user: any) => (
                  <Card key={user.id} className="overflow-hidden">
                    <img
                      src={user.photos?.[0]?.url || '/placeholder.jpg'}
                      alt={user.firstName}
                      className="w-full aspect-square object-cover"
                    />
                    <CardContent className="p-2 text-center">
                      <p className="font-medium text-sm truncate">
                        {user.firstName || 'Someone'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20">
                <CardContent className="py-8 text-center">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="aspect-square rounded-lg bg-muted blur-sm" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Upgrade to Premium to see who liked you
                  </p>
                  <Button
                    onClick={() => document.querySelector('[data-testid="button-start-trial"]')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-gradient-to-r from-pink-500 to-rose-500"
                    data-testid="button-unlock-likes"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Unlock Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Support & FAQ
          </h2>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <h3 className="font-semibold mb-1">How do I cancel my subscription?</h3>
                <p className="text-sm text-muted-foreground">
                  You can cancel anytime through the Manage Subscription button or directly through your payment provider.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Is my payment secure?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes! We use Stripe for secure payment processing. Your card details are never stored on our servers.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Need help?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact us at support@fallonyou.app for any questions.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Shield className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold">GDPR Compliant</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is protected according to EU regulations
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
