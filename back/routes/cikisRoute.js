const express = require('express')
const router = express.Router()
const cikisController = require('../controllers/cikisController')
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT)

router.route('/')
    .patch(cikisController.cikisNote)

module.exports = router