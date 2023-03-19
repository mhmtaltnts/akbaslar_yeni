const Note = require('../models/Note')


const NOTES_PER_PAGE = 100
const rapor = async (req, res) => {
    const page = req.query.page || 1
    try {
        const query = { cikisTarihi: { $exists: true} }
        const sort = {cikisTarihi: -1}
        const skip = (page-1) * NOTES_PER_PAGE
        const count = await Note.countDocuments(query)
        const notes = await Note.find(query)            
            .skip(skip)
            .limit(NOTES_PER_PAGE)
            .sort(sort) 
        const pageCount = count <= NOTES_PER_PAGE ? 1 : Math.ceil(count / NOTES_PER_PAGE)
        return res.json({
            pagination: {
                count,
                pageCount
            },
            notes
        })        
    } catch (error) {
        res.json({error})        
    }
}
const updateRapor = async (req, res) => {
    const {id, user, dorse, getiren, goturen, firma, mal, girisTarihi, cikisTarihi, gumrukBilgi, gumrukBilgiTarihi, guncellemeTarihi} = req.body
    const note = await Note.findById(id).exec()
    if (!note) {
        return res.status(400).json({ message: 'Kayıt bulunamadı' })
    }
    try {
        note.guncellemeYapan = user
        note.dorse = dorse
        note.getiren = getiren
        note.goturen = goturen
        note.firma = firma
        note.mal = mal
        note.girisTarihi = girisTarihi
        note.cikisTarihi = cikisTarihi
        note.gumrukBilgi = gumrukBilgi
        note.gumrukBilgiTarihi = gumrukBilgiTarihi
        note.guncellemeTarihi = guncellemeTarihi 
        const updatedRapor = await note.save()
        res.json(`'${updatedRapor.dorse}' güncellendi`)
    } catch (error) {
        res.json({error})        
    }    
} 


module.exports = {
    rapor,
    updateRapor    
}