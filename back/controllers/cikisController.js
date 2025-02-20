const Note = require('../models/Note')
// @desc Update a note
// @route PATCH /notes
// @access Private
const cikisNote = async (req, res) => {
    const { id, user, goturen, cikisTarihi} = req.body
    // Confirm data
    if (!id || !user || !goturen ) {
        return res.status(400).json({ message: 'Tüm alanları doldurun' })
    }
    // Confirm note exists to update
    try {
        const note = await Note.findById(id).exec()
        note.cikisYapan = user
        note.goturen = goturen
        note.cikisTarihi = cikisTarihi 
        const updatedNote = await note.save()
        res.json(`'${updatedNote.title}' güncellendi`)
    } catch (error) {
        return res.status(400).json({ error})
    }
    
}

module.exports = {
    cikisNote,
}