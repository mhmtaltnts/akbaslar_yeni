const express = require('express')
const router = express.Router()
const gumrukController = require('../controllers/gumrukController')
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT)

router.route('/')
    .patch(gumrukController.gumrukNote)

module.exports = router