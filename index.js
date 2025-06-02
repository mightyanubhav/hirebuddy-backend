require('dotenv').config()

const User = require('./models/user.model')
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
const connectDB = require('./db/db')

const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes') 
app.use(bodyParser.json())

app.post('/check',async (req, res)=>{
    const data = {
        name: 'Anubhav Shukla',
        email: 'kumaranubhav691@gmail.com',
        phone: '7493824269',
        role: 'admin',
        password: 'Anubhav@123',
    }
    const object = new User(data);
    await object.save();
    res.send(object)
})

app.use('/user', userRoutes)
  
async function main(){
    await connectDB()

    app.listen(PORT, () => {
        console.log(`App listening on port ${PORT}`)
    })
}

main()