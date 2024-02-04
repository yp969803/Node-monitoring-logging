const express= require('express')
const app = express()
const PORT=8000
const HOST = '0.0.0.0';

const client= require('prom-client')  
const responseTime = require('response-time')
const collectDefaultMetrics = client.collectDefaultMetrics;

const {createLogger, transports} = require("winston")


const LokiTransport = require("winston-loki");


const options = {
    transports: [
      new LokiTransport({
        host: "http://127.0.0.1:3100"
      })
    ]
    
  };

const logger = createLogger(options)

const reqResTime = new client.Histogram({
    name: 'http_express_req_res_time',
    help: "This tells how much time is taken by req and res",
    labelNames: ["method","route", "status_code"],
    buckets: [1, 50, 100, 200, 400, 500 , 800, 1000, 2000]
})


app.use(responseTime((req, res, time)=>{
    reqResTime.labels({method: req.method, 
      route: req.url,
      status_code: res.statusCode
    }).observe(time)
}))



collectDefaultMetrics({register : client.register})
app.get("/", (req, res)=>{
    logger.info("Req came on / router")
    return res.json({message: "Hello from Express Server"})

})

app.get("/slow", async(req, res)=>{
    try{
       logger.info('Req come on /slow route')
        const timeTaken = await doSomeHeavyTask()
        return res.json({
            status: "Success",
            message:`Heavy task completed `
        })
    }catch(e){
        logger.error(e.message)
        return res.status(500).json({
            status:"Error",
            error: "Internal Server Error"
        })

    }
})

app.get('/metrics', async(req, res)=>{
    res.setHeader('Content-Type', client.register.contentType)
    const metrics = await client.register.metrics()
    
    res.send(metrics);

})

function doSomeHeavyTask() {
    const randomNumber = Math.random();
    var randomThreeDigitNumber = Math.floor(Math.random() * 900) + 100;
   
    
    if (randomNumber < 0.3) {
      throw new Error('Random error occurred!');
    } else {
      
      console.log('No error this time.');
    }
    return new Promise(resolve => {
        setTimeout(resolve, randomThreeDigitNumber);
      });
        
  }

app.listen(PORT,HOST,()=>{
    console.log(`Express Server Started at http://localhost:${PORT}`)
})