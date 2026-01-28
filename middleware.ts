import { paymentMiddleware } from "x402-next";

const SELLERS_WALLET = "0x22b9eD19d81Eb11cB9C34afc6FEB0FD911B12DAe";

const facilitatorObj = {
  url: "https://x402.org/facilitator" as `https://${string}`,
};

export const middleware = paymentMiddleware(
  SELLERS_WALLET,
  {
    "/api/premium": {
      price: "$0.005",
      network: "base-sepolia",
      config: {
        description: "Access to protected premium content",
      },
    },
  },
  facilitatorObj
);

export const config = {
  matcher: ["/api/:path*"]
};


