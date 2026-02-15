type HotPayPaymentArgs = {
  itemId: string;
  amount: number;
  redirectUrl: string;
};

export function buildHotPayPaymentUrl(args: HotPayPaymentArgs) {
  const url = new URL("https://pay.hot-labs.org/payment");
  url.searchParams.set("item_id", args.itemId);
  url.searchParams.set("amount", String(args.amount));
  url.searchParams.set("redirect_url", args.redirectUrl);
  return url.toString();
}
