## Inspiration
On February 4th, 2021 ThetaLabs released the ThetaSwap system which rapidly allowed many users and streamers of the Theta.TV platform to create Streamer-Based TNT-20 tokens and fund swap pairs.  However the ThetaSwap system makes pair discovery difficult, and offers little in the way of pair information for the community.  The enthusiastic response from the community, and desire to learn more about what pairs might exist, how popular the pairs were and what value they may have lead me to developing [thetaindex.io](https://thetaindex.io/).

## What it does
[thetaindex.io](https://thetaindex.io/) discovers TNT-20 token pairs on the ThetaSwap system and provides unprecedented near real-time information about pairs, swap pools and trades. Where possible, [thetaindex.io](https://thetaindex.io/) will attempt to determine a USD price value of a TNT-20 token based on available swap pairs and current TFUEL price, provide pool liquidity information and swap information about any pairs available!

## How I built it
Written on Node.js, [thetaindex.io](https://thetaindex.io/) make use of the ThetaLabsJS libraries to discover, pool and regularly update information about new and ongoing available Swap pairs.  Starting initially with the ThetaSwapFactory Smart contract, [thetaindex.io](https://thetaindex.io/) discovers new pairs, then discovers trade and liquidity information about the pair with additional calls to the Pair Smart Contract .  When a new Pair or Coin is discovered, an additional call to the TNT-20 contract for the coin itself is made to learn basic information about that coin.

## Challenges I ran into
The first challenge was learning Node.JS as I had never programmed in that language nor environment.  Every programming language has its quirks and learning a new one can be tricky. Additionally, I had never worked with the Solidity language, forcing me to learn that as well. This lead to multiple false starts, refactoring of code and design changes.  

## Accomplishments that I'm  proud of
Beyond learning two new programming languages, and a major concept like ThetaSwap, I'm proud to start seeing how active some of the TNT-20 tokens actually are, and being able visibly see the enthusiastic response from the community.

## What's next for [thetaindex.io](https://thetaindex.io/)
Potential integration with the Chrome Wallet extension to allow for a "Portfolio" page and attempt to provide individual user asset tracking features.
