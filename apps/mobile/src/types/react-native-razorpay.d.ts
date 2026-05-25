declare module 'react-native-razorpay' {
  export type RazorpayOpenOptions = {
    key: string;
    amount: string;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color?: string };
  };

  export type RazorpaySuccessResponse = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };

  const RazorpayCheckout: {
    open(options: RazorpayOpenOptions): Promise<RazorpaySuccessResponse>;
  };

  export default RazorpayCheckout;
}
