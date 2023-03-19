const mongoose = require('mongoose')


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
        gumrukBilgi: {
            type: String,
            
        },
        goturen: {
            type: String,
        },
        girisYapan: {
            type: String,
        },
                
        gumrukYapan: {
            type: String,
            
        },
                
        cikisYapan: {
            type: String,
        },        
        guncellemeYapan: {
            type: String,
        },
        girisTarihi:{
            type: Number
        },
        gumrukBilgiTarihi: {
            type: Number,
        },
        cikisTarihi: {
            type: Number,
        },
        guncellemeTarihi: {
            type: Number,
        },
    },
)


module.exports = mongoose.model('Note', noteSchema)