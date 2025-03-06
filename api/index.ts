const express = require('express');
const app = express();
app.get("/",(req,res)=>res.send("EXPRESSONVERCEL"));
app.listen(3000,()=>console.log("ServerReady on port 3000"));
console.log("http://locahost:3000");
module.exports(app);