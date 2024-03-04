fetch('/data')
    .then(response => response.json())
    .then(data => {
        const ohlcData = data.ohlc;
        const volumeData = data.volume;
        console.log(ohlcData);
        if(!ohlcData){
            document.getElementById(display).innerHTML = "Oops! Looks like you forgot to enter a valid stock symbol."
        }
        else{
            const symbol = data.symbol;
        const groupingUnits = [[
            'week',                         // unit name
            [1]                             // allowed multiples
        ], [
            'month',
        ]];
            [1, 2, 3, 4, 6]

        console.log(Highcharts);

        Highcharts.stockChart('chart', {

            rangeSelector: {
                selected: 4
            },
    
            title: {
                text: `${symbol} Historical`
            },
    
            yAxis: [{
                labels: {
                    align: 'right',
                    x: -3
                },
                title: {
                    text: 'OHLC'
                },
                height: '60%',
                lineWidth: 2,
                resize: {
                    enabled: true
                }
            }, {
                labels: {
                    align: 'right',
                    x: -3
                },
                title: {
                    text: 'Volume'
                },
                top: '65%',
                height: '35%',
                offset: 0,
                lineWidth: 2
            }],
    
            tooltip: {
                split: true
            },
    
            series: [{
                type: 'candlestick',
                name: `${symbol}`,
                data: ohlcData,
                dataGrouping: {
                    units: groupingUnits
                }
            }, {
                type: 'column',
                name: 'Volume',
                data: volumeData,
                yAxis: 1,
                dataGrouping: {
                    units: groupingUnits
                }
            }],
            plotOptions: {
                candlestick: {
                    color: 'pink',
                    lineColor: 'red',
                    upColor: 'lightgreen',
                    upLineColor: 'green',
                }
            }
        });
    
        }
});
