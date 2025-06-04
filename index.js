require('dotenv').config()

const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
const connectDB = require('./db/db')

const userRoutes = require('./routes/userRoutes') 
const buddyRoutes = require('./routes/buddyRoutes')

const bodyParser = require('body-parser');


const cookieParser = require("cookie-parser");

app.use(bodyParser.json())
app.use(cookieParser());

app.use('/user', userRoutes)
app.use('/buddy', buddyRoutes)
  
async function main(){
    await connectDB()

    app.listen(PORT, () => {
        console.log(`App listening on port ${PORT}`)
    })
}

main()