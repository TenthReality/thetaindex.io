
const fs = require('fs');
const thetajs = require("@thetalabs/theta-js");
const ThetaSwapFactoryAddress = "0x8366537d56cf2b86ca90e9dbc89450207a29f6e3";
const ThetaUniswapV2Factory = "0xE8B97478ae8AB1fcFd46CdB2F62869eC63BBf69f";
// ABI files needed to contact the various SmartContracts
// do a blocking read on them, they are important.
const ThetaPairABI = fs.readFileSync('PAIR_ABI.txt', 'utf8')
const MintableTNT20ABI = fs.readFileSync('TNT20_ABI.txt', 'utf8');
const ThetaSwapContractABI = fs.readFileSync('ThetaSwapABI.txt', 'utf8');
const FactoryABI = fs.readFileSync('ThetaFactoryABI.txt', 'utf8');
const provider = new thetajs.providers.HttpProvider();
const crypto = require("crypto");
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket("thetaindexio_datastore");
class ThetaSwapMarketIndexer {
    constructor() {
        this.coins = new Array();
        this.pairs = new Array();
        this.priceHistory = new Array();
        this.tfuelPriceHistory = new Array();
        this.thetaPriceHistory = new Array();
        this.reserveHistory = new Array();
        this.allPairsLengthLast = 1;
        this.isFirstStart = false;
        this.snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
    }

    async Initialize() {
        this.loadDataCloud();    // load data

        if (this.isFirstStart) {
            console.log(`[Initialize] - First Start.  Begining with Pair detection + initial price discovery.`);
            this.UpdateTfuelPrice(); // get initial tfuel price
            await this.DiscoverNewPairs(); // start a pair discovery right now
            this.GetPriceData();
        }
    }

    findCoin(coin) {
        return this.coins.find(a => a.id == coin);
    }

    loadData() {
        if (fs.existsSync(__dirname + "/data.json")) {
            const contents = fs.readFileSync(__dirname + "/data.json", 'utf8');

            const obj = JSON.parse(contents);
            this.coins = obj.coins;
            this.pairs = obj.pairs;
            this.priceHistory = obj.priceHistory;
            this.tfuelPriceHistory = obj.tfuelPriceHistory;
            this.thetaPriceHistory = obj.thetaPriceHistory;
            this.allPairsLengthLast = obj.allPairsLengthLast;
            this.reserveHistory = obj.reserveHistory;
        }
        else {
            this.isFirstStart = true;
        }
    }


    loadDataCloud() {
        const blob = bucket.file("data.json");
        let pnt = this;
        blob.download().then(function (data) {
            const contents = data[0];
            const obj = JSON.parse(contents);
            pnt.coins = obj.coins;
            pnt.pairs = obj.pairs;
            pnt.priceHistory = obj.priceHistory;
            pnt.tfuelPriceHistory = obj.tfuelPriceHistory;
            pnt.thetaPriceHistory = obj.thetaPriceHistory;
            pnt.allPairsLengthLast = obj.allPairsLengthLast;
            pnt.reserveHistory = obj.reserveHistory;
        });
    }

    saveData() {
        let obj = {
            coins: this.coins,
            pairs: this.pairs,
            priceHistory: this.priceHistory,
            tfuelPriceHistory: this.tfuelPriceHistory,
            thetaPriceHistory: this.thetaPriceHistory,
            allPairsLengthLast: this.allPairsLengthLast,
            reserveHistory: this.reserveHistory
        };
        let data = JSON.stringify(obj, null, 2);

        fs.writeFile('data.json', data, (err) => {
            if (err) throw err;
            console.log('Data written to file');
        });
    }

    saveDataCloud() {
        let obj = {
            coins: this.coins,
            pairs: this.pairs,
            priceHistory: this.priceHistory,
            tfuelPriceHistory: this.tfuelPriceHistory,
            thetaPriceHistory: this.thetaPriceHistory,
            allPairsLengthLast: this.allPairsLengthLast,
            reserveHistory: this.reserveHistory
        };
        let data = JSON.stringify(obj, null, 2);

        const blob = bucket.file("data.json");

        const blobStream = blob.createWriteStream({
            resumable: false,
        });
        blobStream.end(data);
    }

    UpdateTfuelPriceBinance() {
        const url = "https://www.binance.com/api/v3/depth?symbol=TFUELUSDT&limit=10";
        const url2 = "https://www.binance.com/api/v3/depth?symbol=THETAUSDT&limit=10";
        const settings = { method: "Get" };
        console.log(`[UpdateTfuelPrice] -  starting`);
        //get tfuel price
        fetch(url, settings)
            .then(res => res.json())
            .then((json) => {
                if (json != null) {

                    const tfuel = parseFloat(json.bids[0][0]);

                    console.log(`[UpdateTfuelPrice] -  tfuel price ${tfuel}`);
                    if (this.tfuelPriceHistory.length > 50) {
                        this.tfuelPriceHistory = this.tfuelPriceHistory.slice(1);
                    }

                    if (this.thetaPriceHistory.length > 50) {
                        this.thetaPriceHistory = this.thetaPriceHistory.slice(1);
                    }
                    let lastTfuel = 0;

                    if (this.tfuelPriceHistory.length > 0) lastTfuel = this.tfuelPriceHistory[this.tfuelPriceHistory.length - 1].price;
                    if (tfuel != lastTfuel)
                        this.tfuelPriceHistory.push({ last_updated: new Date(), price: tfuel });
                }
            }).catch((err) => {

                console.log(`[UpdateTfuelPrice] -  ${err}`);
            });
        //get theta price
        fetch(url2, settings)
            .then(res => res.json())
            .then((json) => {
                if (json != null) {

                    const theta = parseFloat(json.bids[0][0]);
                    console.log(`[UpdateTfuelPrice] -  theta price ${theta}`);
                    if (this.thetaPriceHistory.length > 50) {
                        this.thetaPriceHistory = this.thetaPriceHistory.slice(1);
                    }

                    let lastTheta = 0;

                    if (this.thetaPriceHistory.length > 0) lastTheta = this.thetaPriceHistory[this.thetaPriceHistory.length - 1].price;
                    if (theta != lastTheta)
                        this.thetaPriceHistory.push({ last_updated: new Date(), price: theta });
                }
            }).catch((err) => {

                console.log(`[UpdateTfuelPrice] -  ${err}`);
            });

    }

    UpdateTfuelPrice() {
        const url = "https://explorer.thetatoken.org:9000/api/price/all";

        const settings = { method: "Get" };
        console.log(`[UpdateTfuelPrice] -  starting`);

        fetch(url, settings)
            .then(res => res.text())
            .then((text) => {
                console.log(text);
            }).catch((err2) => { console.log(`[UpdateTfuelPrice] -  ${err}`); });


        fetch(url, settings)
            .then(res => res.json())
            .then((json) => {
                if (json != null && json.body != null && json.body.length > 0) {

                    const tfuel = json.body.find(a => a._id == "TFUEL");
                    const theta = json.body.find(a => a._id == "THETA");


                    console.log(`[UpdateTfuelPrice] -  ${tfuel.price}`);
                    if (this.tfuelPriceHistory.length > 50) {
                        this.tfuelPriceHistory = this.tfuelPriceHistory.slice(1);
                    }

                    if (this.thetaPriceHistory.length > 50) {
                        this.thetaPriceHistory = this.thetaPriceHistory.slice(1);
                    }
                    let lastTfuel = 0;

                    if (this.tfuelPriceHistory.length > 0) lastTfuel = this.tfuelPriceHistory[this.tfuelPriceHistory.length - 1].price;
                    if (tfuel.price != lastTfuel)
                        this.tfuelPriceHistory.push({ last_updated: new Date(tfuel.last_updated), price: tfuel.price });


                    let lastTheta = 0;

                    if (this.thetaPriceHistory.length > 0) lastTheta = this.thetaPriceHistory[this.thetaPriceHistory.length - 1].price;
                    if (theta.price != lastTheta)
                        this.thetaPriceHistory.push({ last_updated: new Date(theta.last_updated), price: theta.price });
                }
            }).catch((err) => {

                console.log(`[UpdateTfuelPrice] -  ${err}`);
            });
    }

    getReserve24h(reserves) {
        const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));

        const twentyFour = reserves.filter((a) => {
            var d = new Date(a.date);
            return d > yesterday;
        });
        return twentyFour;
    }

    getReserveOlder24h(reserves) {
        const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));

        const twentyFour = reserves.filter((a) => {
            var d = new Date(a.date);
            return d < yesterday;
        });
        return twentyFour;
    }

    getHistOlder24h(hist) {
        const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));

        const twentyFour = hist.filter((a) => {
            var d = new Date(a.date);
            return d < yesterday;
        });
        return twentyFour;
    }

    async UpdatePairReserves() {
        console.log(`[UpdatePairReserves] - Reserve Update starting.`);
        for (let i = 0; i < this.pairs.length; i++) {
            try {
                const pair = this.pairs[i];
                let pairContract = new thetajs.Contract(this.pairs[i].pairAddress, ThetaPairABI, provider);
                const reserves = await pairContract.getReserves();

                const coin0 = this.findCoin(pair.from);
                const coin1 = this.findCoin(pair.to);
                const tenfrom = (1 * Math.pow(10, coin0.decimals));
                const tento = (1 * Math.pow(10, coin1.decimals));

                const r0 = (reserves.reserve0 / tenfrom).toString();
                const r1 = (reserves.reserve1 / tento).toString();

                const totalHist = this.reserveHistory.filter(a => a.id == pair.id);
                let lastReserveHist = null;


                if (totalHist != null && totalHist.length > 0) {
                    lastReserveHist = totalHist[totalHist.length - 1];
                }

                const reserve24 = this.getReserve24h(totalHist);
                //make two checks, the first handles if we've potential got a liquidity change
                //the other handles if a swap happened
                const lastReserveMisMatch = (lastReserveHist != null && (r0 != lastReserveHist.reserves0 || r1 != lastReserveHist.reserves1));
                const currentReserveMisMatch = (r0 != pair.reserves0 || r1 != pair.reserves1);

                if (currentReserveMisMatch || lastReserveMisMatch) {
                    console.log(`[UpdatePairReserves] - Reserve Update on ${coin0.symbol}:${coin1.symbol} ${r0}-${r1}  old value ${pair.reserves0}:${pair.reserves1}`);

                    this.reserveHistory.push({ id: pair.id, date: new Date(), reserves0: pair.reserves0, reserves1: pair.reserves1 });


                    const olderThan24 = this.getReserveOlder24h(totalHist);

                    pair.reserves0 = (reserves.reserve0 / tenfrom).toString();
                    pair.reserves1 = (reserves.reserve1 / tento).toString();

                }
                if (!this.isFirstStart)
                    pair.swaps = reserve24.length;
                await this.snooze(1500);
            }
            catch (ex) {
                console.log("[UpdatePairReserves]" + ex);
            }
        }
    }

    async DiscoverNewPairs() {
        const tnt20Contract = new thetajs.Contract(ThetaUniswapV2Factory, FactoryABI, provider);

        const totalPairs = await tnt20Contract.allPairsLength(); // get current pair count
        console.log(`[DiscoverNewPairs] - All Pairs Length - ${totalPairs} - Last Indexed ${this.allPairsLengthLast}`);

        // loop from last pair we've walked up to new pair count
        let maxNum = 0;
        for (let i = this.allPairsLengthLast; i < totalPairs; i++) {
            try {
                const currentPairContractAddress = await tnt20Contract.allPairs(i); // get pair contract address
                let pairContract = new thetajs.Contract(currentPairContractAddress, ThetaPairABI, provider);

                //collect token info and reserves about new pair
                const token0 = await pairContract.token0();
                const token1 = await pairContract.token1();
                const reserves = await pairContract.getReserves();

                const coinArray = [token0, token1];
                let coin0 = null;
                let coin1 = null;

                for (let ii = 0; ii < coinArray.length; ii++) {
                    const c = coinArray[ii];
                    let coin = this.coins.find(a => a.tokenAddress.toLowerCase() == c.toLowerCase());
                    if (coin == null) {
                        const newCoin = await this.getToken(c);
                        if (newCoin == null) {
                            return;
                        }
                        // swap system uses Wrapped TFUEL and not TFUEL, lets just correct names here for sanity
                        if (newCoin.symbol == "WTFUEL") {
                            newCoin.symbol = "TFUEL";
                            newCoin.name = "ThetaFuel";
                            newCoin.tokenAddress = newCoin.tokenAddress.toLowerCase();
                        }
                        console.log(`[DiscoverNewPairs] - Found New Coin - ${c} - ${newCoin.symbol}`);
                        this.coins.push(newCoin);
                        coin = newCoin;
                    }
                    if (ii == 0) {
                        coin0 = coin;
                    }
                    else {
                        coin1 = coin;
                    }
                }

                const existingPair = this.pairs.find(a => a.from.tokenAddress == token0 && a.to.tokenAddress == token1);
                // if we've never seen this pair before, add it to new pairs list
                if (existingPair == null) {
                    const uuid = crypto.randomBytes(16).toString("hex");

                    const tenfrom = (1 * Math.pow(10, coin0.decimals));
                    const tento = (1 * Math.pow(10, coin1.decimals));

                    const newPair = { id: uuid, pairAddress: currentPairContractAddress, short: coin0.symbol + ":" + coin1.symbol, from: coin0.id, to: coin1.id, fromSym: coin0.symbol, toSym: coin1.symbol, reserves0: (reserves.reserve0 / tenfrom).toString(), reserves1: (reserves.reserve1 / tento).toString(), tfuelvalue: 0, last: 0, usdlast: 0, preusd: 0, prevLast: 0, change: 0, usdchange: 0, swaps: 0 };
                    console.log(`[DiscoverNewPairs] - New Pair ${this.findCoin(newPair.from).symbol} - ${this.findCoin(newPair.to).symbol}`);
                    this.pairs.push(newPair);
                    this.reserveHistory.push({ id: newPair.id, date: new Date(), reserves0: newPair.reserves0, reserves1: newPair.reserves1 });
                }

                await this.snooze(900);
                this.allPairsLengthLast = i + 1;
            }
            catch (ex) {
                //if we error on discovery, break out and set to max number to pick up again later in case of API timeout/offline/error
                break;
            }
        }
        // mark how far we've walked in pairs for future loads
        console.log(`[DiscoverNewPairs] - Last Indexed Now ${this.allPairsLengthLast}`);
    }

    //build a report of liquidity for each pool
    async LiquidityReport() {
        let retVal = new Array();
        for (let i = 0; i < this.pairs.length; i++) {

            let pair = this.pairs[i];
            let From = this.findCoin(pair.from);
            let To = this.findCoin(pair.to);
            if (To.symbol != "TFUEL" && From.symbol == "TFUEL") { continue; }
            if (To.symbol == "TFUEL") {
                let liquidity1 = pair.reserves1;

                if (liquidity1 > 0)
                    retVal.push({ to: To.symbol, from: From.symbol, liquidity: liquidity1 });
            }
            else if (From.symbol == "TFUEL") {
                let liquidity0 = pair.reserves0;

                if (liquidity0 > 0)
                    retVal.push({ to: To.symbol, from: From.symbol, liquidity: liquidity0 });
            }
        }

        let l0map = retVal.map(a => a.liquidity);
        const reducer = (accumulator, currentValue) => accumulator + currentValue;

        let l0sum = 0;
        if (l0map != null && l0map.length > 0)
            l0sum = l0map.reduce(reducer);

        return {
            total_tfuel_liquidity: l0sum,
            pairs: retVal
        };

    }

    //refresh price data for pairs
    async GetPriceData() {
        try {
            const tprice = this.tfuelPriceHistory[this.tfuelPriceHistory.length - 1];
            console.log("[MAIN] - GetPriceData - Updating Prices");

            for (let i = 0; i < this.pairs.length; i++) {
                let pair = this.pairs[i];
                //console.log(`[MAIN] - Updating Price ${this.findCoin(pair.to).symbol} - ${this.findCoin(pair.from).symbol}`);
                this.getSwapPrice(1, this.findCoin(pair.from), this.findCoin(pair.to)).then(priceResult => {
                    if (priceResult != null) {
                        let currentDate = new Date();

                        let hist = this.priceHistory.find(a => a.id == pair.id);

                        if (hist == null) {
                            this.priceHistory.push(hist = { id: pair.id, history: new Array() });
                        }

                        let price = priceResult.toPrice;
                        let num2 = 1.0e-6;
                        if (price < num2) price = 0;

                        pair.prevLast = pair.last;
                        pair.last = price;
                        pair.change = ((pair.last - pair.prevLast) / pair.prevLast) * 100;


                        let numTfuel = 0;
                        let otherCoinAmt = 0;

                        if (this.findCoin(pair.to).symbol == "TFUEL") {
                            numTfuel = priceResult.toPrice;
                            otherCoinAmt = priceResult.fromPrice;
                        }
                        else if (this.findCoin(pair.from).symbol == "TFUEL") {
                            numTfuel = priceResult.fromPrice;
                            otherCoinAmt = priceResult.toPrice;
                        }
                        let usprice = 0;
                        if (this.findCoin(pair.to).symbol == "TFUEL" || this.findCoin(pair.from).symbol == "TFUEL") {
                            usprice = numTfuel * tprice.price / otherCoinAmt;
                            pair.preusd = pair.usdlast;
                            pair.usdlast = usprice;
                            pair.usdchange = (((pair.usdlast - pair.preusd) / pair.preusd) * 100).toFixed(2);
                            if (pair.usdchange == 0) {
                                pair.usdchange = 0;
                            }
                            if (pair.usdchange == Infinity) {
                                pair.usdchange = 0;
                            }
                        }
                        else {
                            pair.usdlast = 0
                            pair = this.discoverExitPair(pair);
                            //pair.usdlast = 0;
                        }
                        let tmpHist = this.getHistOlder24h(hist.history);
                        let whatsleft = hist.history.filter(function (el) {
                            return !tmpHist.includes(el);
                        });
                        hist.history = whatsleft;
                        hist.history.push({ date: currentDate, toPrice: priceResult.toPrice, fromPrice: priceResult.fromPrice, tprice: tprice.price, usdprice: usprice });

                    }
                });
                await this.snooze(400);
            }
        }
        catch (ex) {
            let x = 1;
        }
    }

    discoverExitPair(pair) {
        let hasTfuelExit = false;
        const coinMap = [this.findCoin(pair.to).id, this.findCoin(pair.from).id];
        const tfuelId = this.coins.find(a => a.symbol == "TFUEL").id;

        for (let i = 0; i < coinMap.length; i++) {
            let coinToMap = this.findCoin(coinMap[i]);
            let matchingExitPair = this.pairs.find(a => (a.from == tfuelId || a.to == tfuelId) && (a.from == coinMap[i] || a.to == coinMap[i]));
            if (matchingExitPair != null) {
                //found an exit pair;
                hasTfuelExit = true;
            }
        }
    }

    // fetch info about a theta TNT20 coin
    async getToken(tokenAddresses) {
        try {
            // The Contract object
            const tnt20Contract = new thetajs.Contract(tokenAddresses, MintableTNT20ABI, provider);
            const uuid = crypto.randomBytes(16).toString("hex");
            var name = await tnt20Contract.name();
            var decimals = await tnt20Contract.decimals();
            var symbol = await tnt20Contract.symbol();
            var pow = 1 * Math.pow(10, decimals);
            var supply = await tnt20Contract.totalSupply();
            var supplyMath = supply / pow;
            return { id: uuid, tokenAddress: tokenAddresses, name: name, decimals: decimals, symbol: symbol, totalSupply: supplyMath };
        }
        catch {
            return null;
        }
    }

    // get a current swap estimate for token0->token1
    async getSwapPrice(amount, token0, token1) {
        const tnt20Contract = new thetajs.Contract(ThetaSwapFactoryAddress, ThetaSwapContractABI, provider);

        const tendest = (1 * Math.pow(10, token1.decimals));
        const tensrc = (1 * Math.pow(10, token0.decimals));
        const ten18S = (amount * Math.pow(10, token0.decimals)).toString(); // we're going to pass this as a string because theta library sucks donkey balls and will have a bignum error if you dont

        try {
            const retVal = await tnt20Contract.getAmountsOut(ten18S, [token0.tokenAddress, token1.tokenAddress]);

            return { fromPrice: retVal[0] / tensrc, toPrice: retVal[1] / tendest };
        }
        catch {
            return null;
        }
    }
}


module.exports = {
    ThetaSwapMarketIndexer: ThetaSwapMarketIndexer,
};