const Note = require('../models/Note')
const User = require('../models/User')

const NOTES_PER_PAGE = 100

const rapor = async (req, res) => {

    const page = req.query.page || 1

    const query = { cikisTarihi: { $exists: true} }
    const sort = {cikisTarihi: -1}

    try {
        const skip = (page-1) * NOTES_PER_PAGE
        const count = await Note.estimatedDocumentCount(query)
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
    // Get all notes from MongoDB
    

    // If no notes 
    


    
}

const getNote = async (req, res) => {
    const { id } = req.params

    // Confirm data
    if (!id) {
        return res.status(400).json({ message: 'Kayıt ID gerekli' })
    }

    // Confirm note exists to delete 
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Kayıt bulunamadı' })
    }

    res.json(note)
}


module.exports = {
    rapor,
    getNote    
}