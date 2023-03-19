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
    const note = await Note.findById(id).exec()
    if (!note) {
        return res.status(400).json({ message: 'Kayıt Bulunamadı' })
    }
    note.cikisYapan = user
    note.goturen = goturen
    note.cikisTarihi = cikisTarihi  

    const updatedNote = await note.save()
    res.json(`'${updatedNote.title}' güncellendi`)
}

module.exports = {
    cikisNote,
}