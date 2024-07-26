import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction, Connection } from '@solana/web3.js';
import { ApiV3PoolInfoStandardItemCpmm, CpmmKeys, CpmmRpcData, CurveCalculator, Raydium } from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { promisify } from 'util';

const sleep = promisify(setTimeout);


const pairIDs = [
  "7mP6WeVYBNt3eao5szsMPmuHughHjNRx26TcrgJXZRky", // SAGIT
  "DaTEcH6da4i1evZU37F9ibQirYXhLKZpKDzDno346nSW", // CANCER
  "3d2KYuMgj2yotNC6SKX4HNoeSWp4n8zqZSQ9kFH81Yta", // SCORPIO
  "48ErBGMqiZekyLoCcebd7cS5KNQPzqr7QQAK9mzAPQGQ", // LEO
  "BygCEAhCNyWC8Co9yPa4K84NGkgkgMWdib2FG5hhuiUv", // AQUARIUS
  "549aknNCvxbiqmikS6sAnY6Dbg37MeENWn6ZFBfc7sin", // CAPRICORN
  "HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS", // ARIES
  "HxhdKrB1UpSwfuMoZMVzPVELzbPWHdyN6PHU9CBFium9", // GEMINI
  "5WcVjf8fzPkHaZqTSZDdbDFL6p2bLbAgEigxpevNrcRh", // VIRGO
  "2GNtxia4fLW3URj5MLqVfgoKrAgDpphtAVazK41eTPfu", // TAURUS
  "DTXPQjK4ae4h2Wc7D5Rpij8YmSQxqLuTcNKrpBCjcAN9", // LIBRA
  "Fzz8QrSV8sPKsTtHocwYARE8Zo6Rd4Wv2Ee4JtCuiDko"  // PISCES
];

const BuyButton: React.FC = () => {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const connection = new Connection('https://api.devnet.solana.com');

  const buyTokens = async () => {
    if (!publicKey || !signTransaction) {
      alert("Please connect your wallet");
      return;
    }

    const raydium = await Raydium.load({
      owner: publicKey,
      connection,
      cluster: 'devnet',
      disableFeatureCheck: true,
      blockhashCommitment: 'finalized',
    });

    const inputAmount = new BN(100); // Replace with the amount to be accepted from the user
    const inputMint = NATIVE_MINT.toBase58();

    const messageInstructions: TransactionInstruction[][] = [];
    const transactions: VersionedTransaction[] = [];

    for (let i = 0; i < pairIDs.length; i++) {
      let poolInfo: ApiV3PoolInfoStandardItemCpmm;
      let poolKeys: CpmmKeys | undefined;
      let rpcData: CpmmRpcData;
      const ids = pairIDs[i];

      const data = await raydium.api.fetchPoolById({ ids });
      poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm;
      rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true);

      const baseIn = inputMint === poolInfo.mintA.address;

      console.log((baseIn ? rpcData.baseReserve : rpcData.quoteReserve).toString());
      const swapResult = CurveCalculator.swap(
        inputAmount,
        baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
        baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
        rpcData.configInfo?.tradeFeeRate,
      );

      const txninf = (i % 3 === 0)
        ? await raydium.cpmm.swap({
            poolInfo,
            poolKeys,
            inputAmount,
            swapResult,
            slippage: 0.1,
            baseIn,
            computeBudgetConfig: {
              units: 600000,
              microLamports: 10000000,
            },
          })
        : await raydium.cpmm.swap({
            poolInfo,
            poolKeys,
            inputAmount,
            swapResult,
            slippage: 0.1,
            baseIn,
          });

      messageInstructions.push(txninf.builder.allInstructions.slice(0, -1));

      if (i % 3 === 2) {
        const lookupTableAddress = new PublicKey("92LsDoZWBLWb2t39Pserc8fmmREqu9G8XUi4gSGnSEtK");
        const lookupTableAccount = (
          await connection.getAddressLookupTable(lookupTableAddress)
        ).value;

        const msg = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: (await connection.getLatestBlockhash("finalized")).blockhash,
          instructions: messageInstructions.flat(),
        }).compileToV0Message([lookupTableAccount]);

        const txn = new VersionedTransaction(msg);
        transactions.push(txn);
        messageInstructions.length = 0;
      }
    }

    for (const txn of transactions) {
      try {
        const signedTransaction = await signTransaction(txn);
        const txid = await connection.sendRawTransaction(signedTransaction.serialize());
        console.log(txid);
      } catch (e: any) {
        console.log(e);
        console.log(await e.getLogs());
      }
      await sleep(5000);
    }
  };

  return <button onClick={buyTokens}>Buy Tokens</button>;
};

export default BuyButton;
