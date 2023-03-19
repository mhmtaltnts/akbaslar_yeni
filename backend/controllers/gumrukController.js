const Note = require('../models/Note')
// @desc Update a note
// @route PATCH /notes
// @access Private
const gumrukNote = async (req, res) => {
    const { id, user, gumrukBilgi, gumrukBilgiTarihi} = req.body
    // Confirm data
    if (!id || !user || !gumrukBilgi ) {
        return res.status(400).json({ message: 'Tüm alanları doldurun' })
    }
    // Confirm note exists to update
    const note = await Note.findById(id).exec()
    if (!note) {
        return res.status(400).json({ message: 'Araç Bulunamadı' })
    }

    note.gumrukYapan = user
    note.gumrukBilgi = gumrukBilgi
    note.gumrukBilgiTarihi = gumrukBilgiTarihi   

    const updatedNote = await note.save()
    res.json(`'${updatedNote.title}' güncellendi`)
}
module.exports = {
    gumrukNote,
}