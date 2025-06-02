require('dotenv').config()

const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
const connectDB = require('./db/db')

app.get('/', (req, res) => {
    res.send('Hello World!')
})
  
async function main(){
    await connectDB()

    app.listen(PORT, () => {
        console.log(`App listening on port ${PORT}`)
    })
}

main()