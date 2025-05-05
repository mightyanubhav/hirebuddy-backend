const express = require('express')
const app = express()
const PORT = 7777


app.get('/', (req, res) => {
    res.send('Hello World!')
})
  
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`)
})