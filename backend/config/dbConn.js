const mongoose = require('mongoose')

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URI)
    } catch (err) {
        console.log(err)
    }
}
mongoose.set('strictQuery', false)
/*const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/akbaslar", 
        {
            useNewURLParser: true,
            useUnifiedTopology: true
        },
        (err) => {
            if(err){
                console.log(err)
            }else{
                console.log("Successfully connected")
            }
        })
    } catch (err) {
        console.log(err)
    }
}*/

module.exports = connectDB