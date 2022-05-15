const express = require('express')
const router = express.Router()

const {userLogin} = require('../controller/loginController')
const {userAuthentication} = require('../middleware/authentication')
const {createUser, getUser, updateUser} = require('../controller/userController')
const {createQuestion, getQuestions, getQuestionById} = require('../controller/questionController')

//User API Route Handlers
router.post('/register', createUser)
router.post('/login', userLogin)
router.get('/user/:userId/profile', userAuthentication, getUser)
router.put('/user/:userId/profile', userAuthentication, updateUser)

//Question API Route Handlers
router.post('/question', userAuthentication, createQuestion)
router.get('/questions', getQuestions)
router.get('/questions/:questionId', getQuestionById)

//Answer API Route Handlers


module.exports = router