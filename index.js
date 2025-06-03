require('dotenv').config()

const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
const connectDB = require('./db/db')

const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes') 
app.use(bodyParser.json())


app.use('/user', userRoutes)
  
async function main(){
    await connectDB()

    app.listen(PORT, () => {
        console.log(`App listening on port ${PORT}`)
    })
}

main()