// Thin server-fn wrappers for wallet auth. Client-safe module (top-level imports don't include admin client).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid wallet address");

export const requestWalletNonce = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ address: AddressSchema }).parse(d))
  .handler(async ({ data }) => {
    const { createNonce } = await import("./wallet-auth.server");
    return createNonce(data.address);
  });

export const verifyWalletAndLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ address: AddressSchema, signature: z.string().min(10) }).parse(d),
  )
  .handler(async ({ data }) => {
    const {
      consumeAndVerifySignature,
      findProfileByWallet,
      mintSessionForEmail,
      walletEmail,
    } = await import("./wallet-auth.server");
    const { wallet } = await consumeAndVerifySignature(data.address, data.signature);
    const profile = await findProfileByWallet(wallet);
    if (!profile) return { needsRegistration: true as const, wallet };
    const session = await mintSessionForEmail(walletEmail(wallet));
    return { needsRegistration: false as const, wallet, ...session };
  });

export const registerWallet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        address: AddressSchema,
        signature: z.string().min(10),
        sponsorCode: z.string().min(3).max(32),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const {
      consumeAndVerifySignature,
      registerNewWallet,
      mintSessionForEmail,
      walletEmail,
      findProfileByWallet,
    } = await import("./wallet-auth.server");
    const { wallet } = await consumeAndVerifySignature(data.address, data.signature);
    const existing = await findProfileByWallet(wallet);
    if (existing) {
      const session = await mintSessionForEmail(walletEmail(wallet));
      return { wallet, ...session };
    }
    await registerNewWallet({ wallet, sponsorCode: data.sponsorCode });
    const session = await mintSessionForEmail(walletEmail(wallet));
    return { wallet, ...session };
  });
