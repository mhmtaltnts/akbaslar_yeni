const Note = require('../models/Note')

// @desc Get all notes 
// @route GET /notes
// @access Private
const getAllNotes = async (req, res) => {
    // Get all notes from MongoDB
    const sort = [['_id', -1]]
    try {
        const notes = await Note.find({ cikisTarihi: { $exists: false} }).sort(sort).lean()    
    // If no notes 
        if (!notes?.length) {
        return res.status(404).json({ message: 'Parkta Araç Yoktur. Araç Girişi Yapabilirsiniz' })
        }
        res.json(notes)
    } catch (error) {
        res.json({error})
    }
}
// @desc Create new note
// @route POST /notes
// @access Private
const createNewNote = async (req, res) => {
    const { user, getiren, dorse, firma, mal, girisTarihi } = req.body
    /* // Confirm data
    if (!user || !getiren || !dorse || !firma) {
        return res.status(400).json({ message: 'Tüm alanlar doldurulmalı' })
    }
 */
    // Create and store the new user 
    const duplicate = await Note.findOne({ dorse })
    .lean()
    .exec();

    if (duplicate) {
        return res.status(409).json({ message: "Bu dorse plakasıyla daha önce giriş yapıldı, yinelemeye izin verilmiyor." });
    } 
    const note = await Note.create({ girisYapan: user, getiren, dorse, firma, mal, girisTarihi })

    if (note) { // Created 
        return res.status(201).json({ message: 'Yeni kayıt oluşturuldu' })
    } else {
        return res.status(400).json({ message: 'Geçersiz veri girişi' })
    }
}
// @desc Update a note
// @route PATCH /notes
// @access Private
const updateNote = async (req, res) => {
    const { id, user, getiren, dorse, firma, mal, girisTarihi, guncellemeTarihi} = req.body
    const note = await Note.findById(id).exec()
    if (!note) {
        return res.status(400).json({ message: 'Araç kaydı bulunamadı' })
    }
    try {
        note.guncellemeYapan = user
        note.girisTarihi = girisTarihi
        note.guncellemeTarihi = guncellemeTarihi
        note.getiren = getiren
        note.dorse = dorse
        note.firma = firma
        note.mal = mal
        const updatedNote = await note.save()
        res.json(`'${updatedNote.dorse}' güncellendi`)
    } catch (error) {
        res.json({error})
    }    
}

const deleteNote = async (req, res) => {
    const { id } = req.body
    if (!id) {
        return res.status(400).json({ message: 'Kayıt ID gerekli' })
    }
    const note = await Note.findById(id).exec()
    if (!note) {
        return res.status(400).json({ message: 'Araç kaydı bulunamadı' })
    }
    try {
        const result = await note.deleteOne()
        const reply = ` '${result.dorse}' dorse numaralı ayıt silindi`
        res.json({reply})
    } catch (error) {
        res.json({error})
    }
    
}

module.exports = {
    getAllNotes,
    createNewNote,
    updateNote,
    deleteNote
}