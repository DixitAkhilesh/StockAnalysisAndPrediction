import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import finnhub, { RecommendationTrend } from 'finnhub';
import {spawn} from 'child_process';

const app = express();
const port = 3000;
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = "cn9gb71r01qoee9a3040cn9gb71r01qoee9a304g"
const finnhubClient = new finnhub.DefaultApi()

const API_KEY = "cn9gb71r01qoee9a3040cn9gb71r01qoee9a304g"


app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.render("index.ejs");
});

let symbol = ""
let profile = "";
let summary = "";
let recommendations = "";
let chart = "";
let news = "";  
let ohlc = [], volume = [], close= [];  
let ipo = "";
let predictedOHLC = "";
let pred= ""
let date = new Date();
var flag = false;

app.post("/", async (req, res) => {
    symbol = req.body.stock_id;

    
    const profileResponse = await axios.get(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`)
    profile = profileResponse.data;
    ipo = profileResponse.data.ipo;
    if(profile)
        res.render("profile.ejs", {profile: profile, ipo: ipo});
    const summaryResponse = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`);
    if(summaryResponse)
        summary = summaryResponse.data;
    
    const recommendationsResponse = await axios.get(`https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${API_KEY}`);
    if(recommendationsResponse)
        recommendations = recommendationsResponse.data[0]

    var startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    var startDate1 = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()-1);
    var sd1 = startDate1.toISOString().split("T")[0];
    var sd = startDate.toISOString().split("T")[0];
    var endDate = new Date(startDate.getFullYear()-1, startDate.getMonth(), startDate.getDate());   
    var ed =  endDate.toISOString().split("T")[0];
    var endDate1 = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()-7);
    var ed1 = endDate1.toISOString().split("T")[0];
    console.log(startDate.toISOString().split("T")[0], endDate.toISOString().split("T")[0]);
    
    flag = false;
    try {
        const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${ed}/${sd}?adjusted=true&sort=asc&apiKey=ctO8iVF_Gi19afBovU1ZSr6UIxqt8Fr3`);
        chart = response.data;  
        try{
            chart.results.forEach(result=>{
                ohlc.push([
                    // date, open,high,low,close
                    result.t,
                    result.o,
                    result.h,
                    result.l,
                    result.c
                ]);
        
                volume.push([
                    result.t,
                    result.v
                ]);
            })
        }
        catch(e){
        }
    } catch (error) {
        // Handle error, including rate limit error
        if (error.response && error.response.status === 429) {
            // Rate limit exceeded
            res.status(429).render("rateLimit.ejs");
        } else {
            // Other errors
            console.error(error);
            res.status(500).send('Internal server error.');
        }
    }

    const response = await axios.get(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${sd1}&to=${sd}&token=${API_KEY}`)
    if(!response ||  Object.keys(response).length === 0){
        res.render("e.ejs");
    }
    else{
        news = response.data;
        news = response.data.slice(0,5);
    }

    if (ohlc && !flag && profile) {
        try{
            const pythonProcess = spawn('python', ['prediction.py']);
            process.env.TF_CPP_MIN_LOG_LEVEL = '2';
        
            pythonProcess.stdin.write(JSON.stringify(ohlc));
            pythonProcess.stdin.end();
            // Initialize an empty string to store the predicted data
            
            pythonProcess.stdout.on('data', (data) => {
                // Convert the binary data to a string
                // console.log(data);
                predictedOHLC = data.toString('utf-8');
            });
            
            pythonProcess.stderr.on('data', (data) => {
                console.error(`Error from Python script: ${data}`);
            });
        
            pythonProcess.on('close', (code) => {
                console.log(`Python script process exited with code ${code}`);
                flag = true;
                // You can further process or send this data as needed
            });
        }
        catch (err) {
            res.render("e.ejs")
        }
    }

    
});

app.get("/search", (req, res) => {
    res.render("index.ejs");
});

app.post("/search", (req, res) => {
    const value = req.body.value;
    if(!symbol)
        res.render("error.ejs");
        
    if(value && profile && symbol && summary && recommendations && news && ohlc && volume)
    {
        if(value === 'predict')
        {
            if(!flag)
            {
                res.render("wait.ejs", {profile: profile})
            }
            // Parse the string into a JavaScript array
            if(flag)
            {
                const array2D = JSON.parse(predictedOHLC);
                pred = array2D.flat();
                res.render("predict.ejs", {pred: pred, date: date, profile: profile, ohlc: ohlc})
            }
        }

        // Flatten the 2D array into a 1D array
        else
        res.render(`${value}.ejs`, {value: value, profile: profile, symbol: symbol, summary: summary, recommendations: recommendations, news: news, ohlc: ohlc, volume: volume})
    }
});

app.get('/data', (req, res) => {
    res.json({ ohlc, volume, symbol });
});

app.get('/p', (req, res) => {
    res.json({predictedOHLC})
})

app.listen(port, ()=>{
    console.log("Listening on port " + port);
});
