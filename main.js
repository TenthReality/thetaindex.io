global.fetch = require("node-fetch");
const Indexer = require('./ThetaSwapMarketIndexer');
const indexer = new Indexer.ThetaSwapMarketIndexer();
const fs = require('fs').promises;


const TIMER_SAVEDATA = 5;
const TIMER_UPDATEFUELPRICE = 10;
const TIMER_DISCOVERYNEWPAIR = 30;
const TIMER_UPDATERESERVES = 5;
const TIMER_UPDATEPRICES = 10;

async function init() {
    await indexer.Initialize();
    //await indexer.DiscoverNewPairs();
}

init().then(a => {
    setInterval(() => {
        indexer.saveData();
    }, 60000 * TIMER_SAVEDATA);

    setInterval(() => {
        indexer.UpdateTfuelPrice();
    }, 60000 * TIMER_UPDATEFUELPRICE);

    setInterval(() => {
        indexer.DiscoverNewPairs();
    }, 60000 * TIMER_DISCOVERYNEWPAIR);

     setInterval(() => {
        indexer.UpdatePairReserves();
    }, 60000 * TIMER_UPDATERESERVES);    

    setInterval(() => {
        indexer.GetPriceData();
    }, 60000 * TIMER_UPDATEPRICES);

}).catch((err) => {
    console.log(err);
});

const compression = require('compression');
const express = require('express');
const app = express();

app.use(compression());

app.get('/', (req, res) => {
    fs.readFile(__dirname + "/index.html", 'utf8').then((data) => {
        res.setHeader('content-type', 'text/html');
        res.send(data);
    });
});

app.get('/css/styles.css', (req, res) => {
    fs.readFile(__dirname + "/styles.css", 'utf8').then(a => {
        res.setHeader('content-type', 'text/css');
        res.send(a);
    });
});

app.get('/js/scripts.js', (req, res) => {
    fs.readFile(__dirname + "/scripts.js", 'utf8').then(a => {
        res.setHeader('content-type', 'text/javascript');
        res.send(a);
    });
});

app.get('/api/pairs', (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify(indexer.pairs.filter(a => a.last > 0)));
});

app.get('/api/tfuel', (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify(indexer.tfuelPriceHistory));
});

app.get('/api/theta', (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify(indexer.thetaPriceHistory));
});

app.get('/api/history/:id', (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify(indexer.priceHistory.find(a => a.id == req.params.id)));
});

app.get('/api/reservehistory/:id', (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify(indexer.reserveHistory.filter(a => a.id == req.params.id)));
});

app.get('/api/coin/:id', (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify(indexer.coins.find(a => a.id == req.params.id)));
});


app.get('/api/liquidity', (req, res) => {
    res.setHeader('content-type', 'application/json');
    indexer.LiquidityReport().then(a => {
        res.send(JSON.stringify(a));
    });
});
const PORT = process.env.PORT || 8090;
app.listen(PORT, function () {
    console.log(`Up and listening on port ${PORT}`)
});
