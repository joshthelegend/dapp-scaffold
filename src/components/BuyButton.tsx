// src/components/BuyButton.tsx
import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

const BuyButton: React.FC = () => {
  const { publicKey, signTransaction } = useWallet();

  const buyTokens = async () => {
    if (!publicKey || !signTransaction) {
      alert("Please connect your wallet");
      return;
    }

    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const tokenMints = [
      // Replace these with the actual mint addresses of the tokens you want to buy
      new PublicKey('TOKEN_MINT_ADDRESS_1'),
      new PublicKey('TOKEN_MINT_ADDRESS_2'),
      new PublicKey('TOKEN_MINT_ADDRESS_3'),
      // Add the remaining 9 token mint addresses
    ];

    const transaction = new Transaction();

    tokenMints.forEach((mint) => {
      const instruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: mint,
        lamports: 1000000, // Replace with the actual amount in lamports
      });
      transaction.add(instruction);
    });

    try {
      const signedTransaction = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature, 'processed');
      alert("Tokens purchased successfully!");
    } catch (error) {
      console.error("Transaction failed", error);
      alert("Transaction failed");
    }
  };

  return <button onClick={buyTokens}>Buy Tokens</button>;
};

export default BuyButton;
