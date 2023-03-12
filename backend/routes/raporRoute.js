const express = require('express')
const router = express.Router()
const raporController = require('../controllers/raporController')
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT)

router.route('/')
    .get(raporController.rapor)
    
router.route('/')    
    .patch(raporController.updateRapor)

module.exports = router