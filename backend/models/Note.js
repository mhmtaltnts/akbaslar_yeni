const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

const noteSchema = new mongoose.Schema(
    {   
        
        getiren: {
            type: String,
            required: true
        },
        dorse: {
            type: String,
            required: true
        },
        firma: {
            type: String,
        },
        mal: {
            type:String
        },
        gumruk: {
            type: String,
            
        },
        goturen: {
            type: String,
        },
        girisYapan: {
            type: String,
        },
                
        gumrukGirisiYapan: {
            type: String,
            
        },
                
        cikisYapan: {
            type: String,
        },        
                 
        guncelleyen: {
            type: String,
        },
        girisTarihi:{
            type: Date
        },
        gumrukGirisTarihi: {
            type: Date,
        },
        cikisTarihi: {
            type: Date,
        },
        degismeTarihi: {
            type: Date,
        },
    },
    {
        timestamps: true
    }
)


module.exports = mongoose.model('Note', noteSchema)