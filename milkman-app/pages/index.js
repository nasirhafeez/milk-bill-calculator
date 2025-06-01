// pages/index.js
import Head from 'next/head';
import MilkmanCalculator from '../components/MilkmanCalculator';

export default function Home() {
  return (
      <>
        <Head>
          <title>Milkman Bill Calculator</title>
          <meta name="description" content="Calculate monthly milk bills with ease" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <MilkmanCalculator />
      </>
  );
}