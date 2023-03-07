const Note = require('../models/Note')
const User = require('../models/User')



// @desc Update a note
// @route PATCH /notes
// @access Private
const gumrukNote = async (req, res) => {
    const { id, user, gumruk} = req.body

    // Confirm data
    if (!id || !user || !gumruk ) {
        return res.status(400).json({ message: 'Tüm alanları doldurun' })
    }

    // Confirm note exists to update
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Bulunamadı' })
    }


    note.gumrukGirisiYapan = user
    note.gumruk = gumruk
    note.gumrukGirisTarihi = Date.now()
    

    const updatedNote = await note.save()

    res.json(`'${updatedNote.title}' güncellendi`)
}




module.exports = {
    gumrukNote,
}