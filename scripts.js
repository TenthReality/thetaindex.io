
let lastTfuelPrice = 0;
$(function () {

  setupSideNav();

  loadData();

  setupCoinTableSort();

  setInterval(refreshData,60000);

  $.getJSON("/api/tfuel", function (json) {
    let labels = json.map(a => new Date(a.last_updated).toLocaleString());
    let data = json.map(a => a.price);
    lastTfuelPrice = data[data.length - 1];
    loadChart("canTfuelChart", "Tfuel Price", labels, data);
  });

  $.getJSON("/api/theta", function (json) {
    let labels = json.map(a => new Date(a.last_updated).toLocaleString());
    let data = json.map(a => a.price);
    loadChart("canThetaChart", "Theta Price", labels, data);
  });

  $.getJSON("/api/liquidity", function (json) {
    const tfuelInPairs = json.total_tfuel_liquidity;
    const totalFundedPairs = json.pairs.length;
    setLiquidity(tfuelInPairs, totalFundedPairs);
  });

  $("#txtPairSearch").on("keyup", function () {
    var value = $(this).val().toLowerCase();
    $("#coinListBody tr").filter(function () {
      $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
  });
});

function setupSideNav() {
  var path = window.location.href; // because the 'href' property of the DOM element is the absolute path
  $("#layoutSidenav_nav .sb-sidenav a.nav-link").each(function () {
    if (this.href === path) {
      $(this).addClass("active");
    }
  });

  // Toggle the side navigation
  $("#sidebarToggle").on("click", function (e) {
    e.preventDefault();
    $("body").toggleClass("sb-sidenav-toggled");
  });
}

function loadData() {
  $.getJSON("/api/pairs", function (json) {
    $('#navItemList tbody').empty();
    setPairCount(json.length);
    for (var i = 0; i < json.length; i++) {
      let coin = json[i];;
      let elm = buildNavbarCoinRow(coin);
      elm.data("pair", coin);
      $('#coinListBody').append(elm);
    }
    $('#coinListBody > tr').click((evt) => {
      displayCoin($(evt.currentTarget).data("pair"));
    });
  });
}


function refreshData() {
  $.getJSON("/api/pairs", function (json) {
    setPairCount(json.length);
    for (var i = 0; i < json.length; i++) {
      let coin = json[i];;
      let elm = updateNavRow(coin);
    }    
    $('#coinListBody > tr').click((evt) => {
      displayCoin($(evt.currentTarget).data("pair"));
    });

    if(currentDisplayedCoin != null)
    {
      displayCoin(currentDisplayedCoin);
    }
  });
}

function rebuildChart(id,chart)
{
    if(chart != null){
      chart.destroy();
    }
    let elm = $('#id');
    let prnt = elm.parent();
    elm.remove();
    prnt.html(elm.html());
    //document.getElementById(id).parentElement.innerHTML = '&nbsp;';
    //document.getElementById(id).parentElement.innerHTML = `<canvas id="${id}" width="100%" height="40"></canvas>`;
}



let tokenRatioChart = null;
let tokenPriceChart = null;

let tokenReserve0 = null;
let tokenReserve1 = null;
let currentDisplayedCoin = null;


function displayCoin(coin) {
  currentDisplayedCoin = coin;
  if (!$('#pnlLanding').hasClass("collapsed")) {
    $('#pnlLanding').addClass('collapse');
    $('#pnlCoinReport').removeClass('collapse');
  }

  $.getJSON("/api/history/" + coin.id, function (json) {
    $.getJSON("/api/reservehistory/" + coin.id, function (reserveHist) {

      const data = json.history.map(a => a.toPrice == 1 ? a.fromPrice.toFixed(8) : a.toPrice.toFixed(8));
      const usdprice = json.history.map(a => a.usdprice.toFixed(6));
      const labels = json.history.map(a => new Date(a.date).toLocaleString());

      const reservelabels = reserveHist.map(a=>new Date(a.date).toLocaleString());

      const reserve0Data = reserveHist.map(a=> a.reserves0);
      const reserve1Data = reserveHist.map(a=> a.reserves1);

      rebuildChart("canTokenRatio",tokenRatioChart);
      rebuildChart("canTokenPrice",tokenPriceChart);
      rebuildChart("canReserve0",tokenReserve0);
      rebuildChart("canReserve1",tokenReserve1);

      // if (tokenRatioChart != null) tokenRatioChart.destroy();
      // if (tokenPriceChart != null) tokenPriceChart.destroy();
      // if (tokenReserve0 != null) tokenReserve0.destroy();
      // if (tokenReserve1 != null) tokenReserve1.destroy();

      $('#txtSwapName').text(coin.short);

      $.getJSON("/api/coin/" + coin.to, function (coinData) {
        $.getJSON("/api/coin/" + coin.from, function (coinFromData) {


          tokenRatioChart = loadChart("canTokenRatio", `${coin.short} Ratio`, labels, data, true);
          tokenPriceChart = loadChart("canTokenPrice", "USD Value", labels, usdprice, false);
          tokenReserve0 = loadChart("canReserve0", `Changes To ${coinFromData.symbol} Reserves`, reservelabels, reserve0Data, false);
          tokenReserve1 = loadChart("canReserve1", `Changes To  ${coinData.symbol} Reserves`, reservelabels, reserve1Data, false);

          const twentyFour = get24h(json);

          const average = ((twentyFour.reduce((accumulator, currentValue) => accumulator.toPrice + currentValue.toPrice)) / twentyFour.length).toFixed(8);

          const marketCap = (coinData.totalSupply * coin.usdlast).toFixed(0);
          const marketCap2 = (coinFromData.totalSupply * coin.usdlast).toFixed(0);
          const incPrice = coin.last;
          const incPricePct = coin.usdchange;
          const lastPrice = coin.lastPrice;
          const textStyle = incPricePct < 0 ? "text-danger" : "text-success";


          let lst = coin.last;
          if (lst > 1000000) lst = lst.toFixed(0);
          else if (lst > 10000) lst = lst.toFixed(2);
          else if (lst > 100) lst = lst.toFixed(3);
          else lst = lst.toFixed(6);

          const toCAUrl = `https://explorer.thetatoken.org/account/${coinData.tokenAddress}`;
          const fromCAUrl = `https://explorer.thetatoken.org/account/${coinFromData.tokenAddress}`;


          const toUrl = `https://swap.thetatoken.org/swap?tokenAddressInput=${coinData.tokenAddress}&tokenAddressOutput=${coinFromData.tokenAddress}`;
          const fromUrl = `https://swap.thetatoken.org/swap?tokenAddressInput=${coinFromData.tokenAddress}&tokenAddressOutput=${coinData.tokenAddress}`;


          $('#ulCoinReport2').empty();
          $('#ulCoinReport2').parent().children('.buyLink').remove();
          $('#ulCoinReport2').parent().children('.card-body').text(`Name : ${coinData.name}`);
          $('#ulCoinReport2').append($(`<li class="list-group-item bg-secondary contractaddress text-truncate">Address : <a href='${toCAUrl}' target=_blank>${coinData.tokenAddress}</a></li>`))
          $('#ulCoinReport2').append($(`<li class="list-group-item bg-secondary">Decimals : ${coinData.decimals}</li>`))
          $('#ulCoinReport2').append($(`<li class="list-group-item bg-secondary">Total Supply : ${numberWithCommas(Math.round(coinData.totalSupply, 0))}</li>`))
          $('#ulCoinReport2').parent().append($(`<a href='${toUrl}' target=_blank class="list-group-item list-group-item-dark buyLink">Swap ${coinData.name}</a>`))


          $('#ulCoinReport').empty();
          $('#ulCoinReport').parent().children('.buyLink').remove();
          $('#ulCoinReport').parent().children('.card-body').text(`Name : ${coinFromData.name}`);
          $('#ulCoinReport').append($(`<li class="list-group-item bg-secondary contractaddress text-truncate">Address : <a href='${fromCAUrl}' target=_blank>${coinFromData.tokenAddress}</a></li>`))
          $('#ulCoinReport').append($(`<li class="list-group-item bg-secondary">Decimals : ${coinFromData.decimals}</li>`))
          $('#ulCoinReport').append($(`<li class="list-group-item bg-secondary">Total Supply : ${numberWithCommas(Math.round(coinFromData.totalSupply, 0))}</li>`))
          $('#ulCoinReport').parent().append($(`<a href='${fromUrl}' target=_blank class="list-group-item list-group-item-dark buyLink">Swap ${coinFromData.name}</a>`))


          $('#ulLiquidReport').empty();
          $('#ulLiquidReport').append($(`<li class="list-group-item bg-secondary">${coin.fromSym} ${numberWithCommas(parseFloat(coin.reserves0).toFixed(2))}</li>`))
          $('#ulLiquidReport').append($(`<li class="list-group-item bg-secondary">${coin.toSym}  ${numberWithCommas(parseFloat(coin.reserves1).toFixed(2))}</li>`))
          $('#ulLiquidReport').append($(`<li class="list-group-item bg-secondary">Estimated Number Of Swaps: ${numberWithCommas(coin.swaps)}</li>`))
          $('#ulLiquidReport').append($(`<li class="list-group-item bg-secondary">Last Swap Price: ${lst}</li>`))
        });
      });
    });
  });
}

function get24h(hist) {
  const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));

  const twentyFour = hist.history.filter((a) => {
    var d = new Date(a.date);
    return d > yesterday;
  });
  return twentyFour;
}


function numberWithCommas(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}
function setPairCount(totalPairs) {
  $('#txtTotalPairs').text(`${totalPairs} Total Pairs`);
  setStatistics();
}

function setStatistics() {
  $('#txtTotalEstSwaps').text('18 Estimated Swaps');
}

function setLiquidity(liquidity, pairs) {
  $('#txtLiquidityReport').text(`TFuel In Swaps - ${liquidity}`);
  $('#txtLiquidityPairs').text(`${pairs} Total Pairs With TFuel Liquidity`);
  $('#txtLiquidityValue').text(`Total $${(liquidity * lastTfuelPrice).toFixed(2)}`);
}

function buildNavbarCoinRow(coin) {
  let lst = coin.last;
  if (lst > 1000000) lst = lst.toFixed(0);
  else if (lst > 10000) lst = lst.toFixed(2);
  else if (lst > 100) lst = lst.toFixed(3);
  else lst = lst.toFixed(6)

  let css = "";
  if (coin.usdchange > 0) css = "text-success";
  else if (coin.usdchange < 0) css = "text-danger";

  var elm = $(`<tr data-coin="${coin.id}"><td>${coin.fromSym}</td><td>${coin.toSym}</td><td><span>${lst}</span></td><td>${coin.usdlast.toFixed(6)}</td><td class="text-right">${coin.swaps}</td></tr>`);
  return elm;
}

function updateNavRow(coin) {

  let lst = coin.last;
  if (lst > 1000000) lst = lst.toFixed(0);
  else if (lst > 10000) lst = lst.toFixed(2);
  else if (lst > 100) lst = lst.toFixed(3);
  else lst = lst.toFixed(6)

  var elm = $(`#coinListBody tr[data-coin="${coin.id}"]`);
  elm.data("pair", coin);
  elm.find('td:nth-child(3)').text(lst);
  elm.find('td:nth-child(4)').text(coin.usdlast.toFixed(6));
  elm.find('td:nth-child(5)').text(coin.swaps);

}

function updateNavbar(coins)
{
  for(let i=0; i<coins.lenght; i++)
  {
    updateNavRow(coins[i]);
  }
}

function setChartHeader(id, header) {
  $(`#${id}`).parent().parent().children('.card-header').html(`<i class="fas fa-chart-area mr-1"></i>${header}`);
}

function loadChart(id, header, labels, data, beginAtZero) {
  setChartHeader(id, header);
  // Set new default font family and font color to mimic Bootstrap's default styling
  Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  Chart.defaults.global.defaultFontColor = '#292b2c';

  // Area Chart Example
  var ctx = document.getElementById(id);
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: "Price",
        lineTension: 0.3,
        backgroundColor: "rgba(2,117,216,0.2)",
        borderColor: "rgba(2,117,216,1)",
        pointRadius: 5,
        pointBackgroundColor: "rgba(2,117,216,1)",
        pointBorderColor: "rgba(255,255,255,0.8)",
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "rgba(2,117,216,1)",
        pointHitRadius: 50,
        pointBorderWidth: 2,
        data: data,
      }],
    },
    options: {
      scales: {
        xAxes: [{
          time: {
            unit: 'date'
          },
          gridLines: {
            display: false
          }
        }],
        yAxes: [{
          gridLines: {
            color: "rgba(0, 0, 0, .125)",
          },
        }],
      },
      legend: {
        display: false
      }
    }
  });
}


function setupCoinTableSort() {
  $('th').click(function () {
    var table = $(this).parents('table').eq(0)
    var rows = table.find('tr:gt(0)').toArray().sort(comparer($(this).index()))
    this.asc = !this.asc
    if (!this.asc) { rows = rows.reverse() }
    for (var i = 0; i < rows.length; i++) { table.append(rows[i]) }
  });
}

function comparer(index) {
  return function (a, b) {
    var valA = getCellValue(a, index), valB = getCellValue(b, index)
    return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.toString().localeCompare(valB)
  }
}

function getCellValue(row, index) { return $(row).children('td').eq(index).text() }


